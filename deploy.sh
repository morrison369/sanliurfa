#!/bin/bash

# ============================================
# Şanlıurfa.com - Production Deployment Script
# ============================================

set -e

echo "🚀 Starting deployment..."

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

# Check Node.js version
if ! node --version | grep -q "v20"; then
    echo -e "${RED}Error: Node.js 20.x required${NC}"
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Run linting
echo "🔍 Running linter..."
npm run lint

# Run tests
echo "🧪 Running tests..."
npm run test:unit

# Build application
echo "🏗️ Building application..."
npm run build

# Check build output
if [ ! -d "dist" ]; then
    echo -e "${RED}Error: Build failed - dist folder not found${NC}"
    exit 1
fi

# Sync static assets
echo "📁 Syncing static assets..."
rsync -av --delete public/ dist/client/ 2>/dev/null || cp -r public/* dist/client/ 2>/dev/null || true

# Restart PM2 (if using)
if command -v pm2 &> /dev/null; then
    echo "🔄 Restarting PM2..."
    pm2 restart ecosystem.config.js || pm2 start dist/server/entry.mjs --name "sanliurfa"
fi

echo -e "${GREEN}✅ Deployment successful!${NC}"
