#!/bin/bash
# Initial Server Setup Script

set -e

echo "🚀 Setting up Şanlıurfa.com server..."

# Update system
sudo apt-get update
sudo apt-get upgrade -y

# Install Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2
sudo npm install -g pm2

# Install Nginx
sudo apt-get install -y nginx

# Install Redis (optional)
sudo apt-get install -y redis-server

# Install Certbot for SSL
sudo apt-get install -y certbot python3-certbot-nginx

# Create app directory
sudo mkdir -p /var/www/sanliurfa.com
sudo chown -R $USER:$USER /var/www/sanliurfa.com

# Create logs directory
mkdir -p /var/www/sanliurfa.com/logs

# Setup firewall
sudo ufw allow 'Nginx Full'
sudo ufw allow OpenSSH
sudo ufw --force enable

echo "✅ Server setup complete!"
echo ""
echo "Next steps:"
echo "1. Clone your repository to /var/www/sanliurfa.com"
echo "2. Run: cd /var/www/sanliurfa.com && ./scripts/deploy.sh"
echo "3. Configure Nginx (see nginx.conf)"
echo "4. Run: sudo certbot --nginx -d sanliurfa.com"
