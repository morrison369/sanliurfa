#!/bin/bash
# Quick restart script for sanliurfa.com
# Run on server: ssh sanliur@168.119.79.238 -p 77

cd /home/sanliur/public_html
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

# Kill port if in use
echo "3. Clearing port 6000..."
fuser -k 6000/tcp 2>/dev/null || true

# Start
echo "4. Starting app..."
pm2 delete sanliurfa 2>/dev/null
pm2 start dist/server/entry.mjs --name sanliurfa -- --port 6000
sleep 2
pm2 save

# Test
echo "5. Testing..."
HTTP=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:6000/)
if [ "$HTTP" = "200" ]; then
    echo "✅ HTTP 200 - Site is UP!"
else
    echo "⚠️ HTTP $HTTP - Check logs: pm2 logs sanliurfa"
fi

echo ""
pm2 list | grep sanliurfa
