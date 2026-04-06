#!/bin/bash
# Fix and start application - Run on server
# ssh sanliur@168.119.79.238 -p 77

echo "🔧 Fix and Start Application"
echo "============================"

cd /home/sanliur/public_html
source ~/.nvm/nvm.sh

# 1. Stop existing app
echo "1. Stopping existing app..."
pm2 stop sanliurfa 2>/dev/null
pm2 delete sanliurfa 2>/dev/null
fuser -k 6000/tcp 2>/dev/null || true
sleep 2

# 2. Check environment
echo "2. Environment check..."
if [ ! -f ".env.production" ]; then
    echo "   ❌ .env.production missing!"
    exit 1
fi
echo "   ✅ .env.production exists"

# 3. Check build
echo "3. Build check..."
if [ ! -f "dist/server/entry.mjs" ]; then
    echo "   ❌ Build missing! Building..."
    npm run build
fi
echo "   ✅ Build exists"

# 4. Start application
echo "4. Starting application on port 6000..."
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

node dist/server/entry.mjs --port 6000 &
APP_PID=$!
echo "   PID: $APP_PID"
sleep 5

# 5. Test
echo "5. Testing..."
HTTP=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:6000/ 2>/dev/null)
if [ "$HTTP" = "200" ]; then
    echo "   ✅ HTTP 200 - Application is working!"
else
    echo "   ❌ HTTP $HTTP - Application failed"
    kill $APP_PID 2>/dev/null
    exit 1
fi

# 6. Save to PM2
echo "6. Saving to PM2..."
pm2 start dist/server/entry.mjs --name sanliurfa -- --port 6000
pm2 save

echo ""
echo "============================"
echo "✅ Application started!"
echo ""
echo "📊 Status:"
pm2 list | grep sanliurfa
