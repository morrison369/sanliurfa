# Deployment Guide: CentOS Web Panel (Shared Hosting)

This guide covers deploying Şanlíurfa.com on **CentOS Web Panel shared hosting** (NOT Docker).  
All services run directly on the host under your user account.

---

## Prerequisites

- CentOS Web Panel installed and configured
- SSH access to your hosting account
- Your own user account (e.g., `sanliurfa`)
- PostgreSQL and Redis access (provided by hosting)
- Domain configured in CWP

Verify:
```bash
whoami
echo $HOME
```

---

## Step 1: Node.js Installation (NVM)

```bash
# Install NVM
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc

# Install Node 18
nvm install 18
nvm use 18
nvm alias default 18

# Verify
node --version
npm --version
```

---

## Step 2: Clone & Setup

```bash
cd ~
git clone https://github.com/your-repo/sanliurfa.git
cd sanliurfa
npm install --legacy-peer-deps

# Create .env
cp .env.example .env
nano .env
```

### Critical .env Variables

```bash
DATABASE_URL="postgresql://user:pass@localhost:5432/sanliurfa"
JWT_SECRET="your-long-random-min-32-chars"
REDIS_URL="redis://:password@localhost:6379/0"
REDIS_KEY_PREFIX="sanliurfa:"
NODE_ENV="production"
CORS_ORIGINS="https://sanliurfa.com,https://www.sanliurfa.com"
HOST="127.0.0.1"
PORT="6000"
```

Generate JWT_SECRET:
```bash
openssl rand -hex 32
```

---

## Step 3: Database Setup

```bash
# Connect to PostgreSQL
psql -U postgres -h localhost

# Create DB
CREATE DATABASE sanliurfa;
CREATE USER sanliurfa_user WITH PASSWORD 'your-password';
GRANT ALL PRIVILEGES ON DATABASE sanliurfa TO sanliurfa_user;
ALTER DATABASE sanliurfa OWNER TO sanliurfa_user;
\q

# App creates tables on first startup
```

---

## Step 4: Redis Verification

```bash
redis-cli -h localhost ping
# PONG

redis-cli -u "redis://:password@localhost:6379/0" ping
```

---

## Step 5: Build

```bash
cd ~/sanliurfa
npm run build
ls -la .output/server/
```

---

## Step 6: PM2 Service

```bash
npm install -g pm2
pm2 startup
```

Create `ecosystem.config.js`:
```javascript
module.exports = {
  apps: [{
    name: 'sanliurfa',
    script: './node_modules/.bin/astro',
    args: 'preview',
    cwd: '/home/sanliurfa/sanliurfa',
    env: { NODE_ENV: 'production', PORT: 6000 },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    autorestart: true,
    max_restarts: 10,
    min_uptime: '60s'
  }]
};
```

Start:
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
pm2 logs sanliurfa
```

Commands:
```bash
pm2 stop sanliurfa
pm2 restart sanliurfa
pm2 delete sanliurfa
pm2 logs sanliurfa
pm2 monit
```

---

## Step 7: Nginx Reverse Proxy (CWP)

CWP Admin Panel → Domain Manager → Edit → Nginx Configuration:

```nginx
upstream sanliurfa_backend {
    server 127.0.0.1:6000;
    keepalive 32;
}

server {
    listen 80;
    server_name sanliurfa.com www.sanliurfa.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name sanliurfa.com www.sanliurfa.com;

    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;

    ssl_protocols TLSv1.2 TLSv1.3;
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;

    location / {
        proxy_pass http://sanliurfa_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Save and reload Nginx in CWP.

---

## Step 8: SSL (Let's Encrypt via CWP)

CWP Admin → SSL Manager → Select domain → Install Free SSL

---

## Step 9: Automated Backups

Create `scripts/backup-db.sh`:

```bash
#!/bin/bash
BACKUP_DIR="$HOME/backups/database"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p "$BACKUP_DIR"
pg_dump -U sanliurfa_user -h localhost sanliurfa | gzip > "$BACKUP_DIR/sanliurfa_${DATE}.sql.gz"
find "$BACKUP_DIR" -type f -mtime +7 -delete
```

Schedule with crontab:
```bash
chmod +x scripts/backup-db.sh
crontab -e
# Add: 0 2 * * * $HOME/sanliurfa/scripts/backup-db.sh >> $HOME/logs/backup.log 2>&1
```

---

## Step 10: Monitoring

### Logs
```bash
pm2 logs sanliurfa
tail -f ~/sanliurfa/logs/pm2-out.log
```

### Health Check
```bash
curl https://sanliurfa.com/api/health
```

### Database
```bash
psql -U sanliurfa_user -d sanliurfa -h localhost -c "SELECT version();"
```

### Redis
```bash
redis-cli ping
redis-cli info memory
```

---

## Step 11: Update Workflow

```bash
cd ~/sanliurfa
git pull origin main
npm install --legacy-peer-deps
npm run build
pm2 restart sanliurfa
curl https://sanliurfa.com/api/health
```

---

## Production Checklist

- [ ] .env with DATABASE_URL, JWT_SECRET, REDIS_URL
- [ ] NODE_ENV=production
- [ ] Database migrated
- [ ] Redis online (redis-cli ping)
- [ ] Service auto-starts
- [ ] Nginx forwarding to 6000
- [ ] SSL certificate installed
- [ ] /api/health returns healthy
- [ ] Backups scheduled

---

## Troubleshooting

### Port 6000 in use
```bash
lsof -i :6000
kill -9 <PID>
```

### Redis connection error
```bash
redis-cli ping
sudo systemctl start redis
```

### Database error
```bash
psql -U sanliurfa_user -d sanliurfa -h localhost -c "SELECT 1;"
```

### App won't start
```bash
pm2 logs sanliurfa --lines 50
rm -rf .output/ && npm run build
pm2 restart sanliurfa
```

### Nginx not forwarding
```bash
sudo nginx -t
curl http://127.0.0.1:6000
sudo systemctl reload nginx
```

---

## Performance Tuning

### Multi-core (cluster mode)
Edit `ecosystem.config.js`:
```javascript
exec_mode: 'cluster',
instances: 'max'
```
Then: `pm2 restart sanliurfa`

### Redis memory
```bash
sudo nano /etc/redis.conf
# maxmemory 512mb
# maxmemory-policy allkeys-lru
sudo systemctl restart redis
```

### Check slow queries
```bash
curl -H "Cookie: auth-token=TOKEN" https://sanliurfa.com/api/performance
```

---

## Security

### Permissions
```bash
chmod 600 ~/.env
chmod 600 ~/sanliurfa/.env
chmod 700 ~/backups/
```

### Firewall
```bash
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 22
sudo ufw deny 6000
```

---

## Health Check Script

Create `scripts/health-check.sh`:

```bash
#!/bin/bash
if ! curl -s "https://sanliurfa.com/api/health" | grep -q "healthy"; then
    pm2 restart sanliurfa
fi
```

Schedule: `*/5 * * * * $HOME/sanliurfa/scripts/health-check.sh`

---

## Resources

- CWP: https://centos-web-panel.com/documentation.html
- PM2: https://pm2.keymetrics.io/docs/usage/quick-start/
- Node.js Production: https://nodejs.org/en/docs/guides/nodejs-web-app-production-checklist/
