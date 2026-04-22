#!/bin/bash
set -euo pipefail

APP_PORT="${PORT:-4321}"
APP_ROOT="${APP_ROOT:-/home/sanliur/public_html}"

cd "$APP_ROOT"
source ~/.nvm/nvm.sh

echo "🚀 Quick Restart"
echo "================"

# Stop
echo "1. Stopping app..."
pm2 stop sanliurfa 2>/dev/null

# Check build
if [ ! -f "dist/server/entry.mjs" ]; then
    echo "2. ❌ Build missing, building..."
    npm run build
else
    echo "2. ✅ Build exists"
fi

# Kill only the canonical app port if in use
echo "3. Clearing port ${APP_PORT}..."
fuser -k "${APP_PORT}/tcp" 2>/dev/null || true

# Start
echo "4. Starting app..."
pm2 delete sanliurfa 2>/dev/null
pm2 start ecosystem.config.cjs --env production
sleep 2
pm2 save

# Test
echo "5. Testing..."
HTTP=$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:${APP_PORT}/")
if [ "$HTTP" = "200" ]; then
    echo "✅ HTTP 200 - Site is UP!"
else
    echo "⚠️ HTTP $HTTP - Check logs: pm2 logs sanliurfa"
fi

echo ""
pm2 list | grep sanliurfa || true
