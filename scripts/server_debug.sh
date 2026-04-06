#!/bin/bash
# Debug script - run this on the server
# ssh sanliur@168.119.79.238 -p 77
# bash /home/sanliur/public_html/scripts/server_debug.sh

echo "🔍 Application Debug"
echo "===================="

source ~/.nvm/nvm.sh
cd /home/sanliur/public_html

# 1. PM2 Status
echo ""
echo "1️⃣ PM2 Status:"
pm2 list | grep sanliurfa

# 2. Check build files
echo ""
echo "2️⃣ Build Files:"
if [ -f "dist/server/entry.mjs" ]; then
    echo "✅ dist/server/entry.mjs exists"
    ls -lh dist/server/entry.mjs
else
    echo "❌ dist/server/entry.mjs NOT FOUND"
    echo "   Run: npm run build"
fi

# 3. Check .env.production
echo ""
echo "3️⃣ Environment:"
if [ -f ".env.production" ]; then
    echo "✅ .env.production exists"
    # Check critical variables (don't show values)
    if grep -q "DATABASE_URL" .env.production; then
        echo "   ✅ DATABASE_URL set"
    else
        echo "   ❌ DATABASE_URL missing"
    fi
    if grep -q "JWT_SECRET" .env.production; then
        echo "   ✅ JWT_SECRET set"
    else
        echo "   ❌ JWT_SECRET missing"
    fi
else
    echo "❌ .env.production NOT FOUND"
fi

# 4. Check port 6000
echo ""
echo "4️⃣ Port 6000:"
PORT_CHECK=$(ss -tlnp 2>/dev/null | grep 6000 || netstat -tlnp 2>/dev/null | grep 6000)
if [ -n "$PORT_CHECK" ]; then
    echo "✅ Port 6000 is listening"
    echo "   $PORT_CHECK"
else
    echo "❌ Port 6000 NOT listening"
fi

# 5. Recent logs
echo ""
echo "5️⃣ Recent Logs (last 20 lines):"
pm2 logs sanliurfa --lines 20 2>/dev/null | tail -20

# 6. Test application startup
echo ""
echo "6️⃣ Testing Application Startup:"
echo "   Starting for 3 seconds..."
timeout 3 node dist/server/entry.mjs --port 6000 2>&1 &
PID=$!
sleep 3
kill $PID 2>/dev/null

# 7. Check if PostgreSQL is accessible
echo ""
echo "7️⃣ PostgreSQL Connection:"
if psql -U sanliur_sanliurfa -d sanliur_sanliurfa -h localhost -c "SELECT 1" >/dev/null 2>&1; then
    echo "✅ PostgreSQL connection OK"
else
    echo "❌ PostgreSQL connection FAILED"
fi

# 8. Recommendations
echo ""
echo "===================="
echo "💡 Recommendations:"

if [ ! -f "dist/server/entry.mjs" ]; then
    echo "   → Run: npm run build"
fi

if [ ! -f ".env.production" ]; then
    echo "   → Create .env.production file"
fi

echo "   → Restart: pm2 restart sanliurfa"
echo "   → Logs: pm2 logs sanliurfa"
echo ""

# Auto-fix option
echo "🔧 Auto-fix? (y/n)"
read -t 5 -n 1 -r
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "Applying fixes..."
    
    # Stop app
    pm2 stop sanliurfa 2>/dev/null
    
    # Rebuild if needed
    if [ ! -f "dist/server/entry.mjs" ]; then
        echo "Building..."
        npm run build
    fi
    
    # Restart
    pm2 restart sanliurfa || pm2 start dist/server/entry.mjs --name sanliurfa -- --port 6000
    pm2 save
    
    echo "✅ Done! Check: pm2 logs sanliurfa"
else
    echo ""
    echo "Skipping auto-fix"
fi
