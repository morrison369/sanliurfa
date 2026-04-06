# Şanlıurfa.com - Deployment Guide

## 🚀 Quick Deploy

```bash
# SSH to server
ssh sanliur@168.119.79.238 -p 77

# Go to project directory
cd /home/sanliur/sanliurfa.com

# Pull latest changes
git pull

# Run deploy script
./scripts/deploy.sh
```

## 📋 Prerequisites

- Node.js 22.12.0+ (via NVM)
- PostgreSQL 16
- PM2
- Apache/Nginx (reverse proxy)

## ⚙️ Environment Variables

Create `.env.production`:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/database
JWT_SECRET=your-super-secret-key
SITE_URL=https://sanliurfa.com
PORT=6000
```

## 🗄️ Database Setup

```bash
# Run schema
psql -U sanliur_sanliurfa -d sanliur_sanliurfa -f database/schema.sql
```

## 🔧 PM2 Commands

```bash
pm2 status              # View status
pm2 logs sanliurfa      # View logs
pm2 restart sanliurfa   # Restart
pm2 stop sanliurfa      # Stop
```

## 📁 Project Structure

```
sanliurfa.com/
├── sanliurfa/           # Main Astro app
│   ├── src/
│   │   ├── pages/       # Routes
│   │   ├── components/  # UI components
│   │   ├── lib/         # Utilities (auth, postgres)
│   │   └── middleware/  # Astro middleware
│   ├── database/
│   │   └── schema.sql   # DB schema
│   └── scripts/
│       ├── deploy.sh    # Deploy script
│       └── backup.sh    # Backup script
└── DEPLOYMENT.md        # This file
```

## 🚨 Troubleshooting

### 500 Errors
1. Check PM2 logs: `pm2 logs sanliurfa`
2. Verify database connection
3. Check `.env.production` values

### Database Issues
```bash
# Test connection
psql -U sanliur_sanliurfa -h localhost -c "SELECT 1"

# Check tables
psql -U sanliur_sanliurfa -c "\dt"
```

### Build Errors
```bash
# Clean and rebuild
rm -rf dist node_modules
npm install
npm run build
```

## 🔄 Auto-Deploy with GitHub Actions

Add `.github/workflows/deploy.yml`:

```yaml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to server
        run: |
          ssh sanliur@168.119.79.238 -p 77 'cd /home/sanliur/sanliurfa.com && git pull && ./scripts/deploy.sh'
```

## 📞 Support

- Server: 168.119.79.238:77
- PM2: `pm2 monit`
- Logs: `~/.pm2/logs/`
