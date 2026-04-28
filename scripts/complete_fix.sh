#!/bin/bash
# Complete fix script - Run on server
# ssh sanliur@168.119.79.238 -p 77
# bash /home/sanliur/public_html/scripts/complete_fix.sh

echo "🔧 Complete Fix Script"
echo "======================"

cd /home/sanliur/public_html

# 1. Environment
echo ""
echo "1️⃣ Loading environment..."
source ~/.nvm/nvm.sh
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# 2. Stop everything
echo ""
echo "2️⃣ Stopping services..."
pm2 stop sanliurfa 2>/dev/null
pm2 delete sanliurfa 2>/dev/null
fuser -k 4321/tcp 2>/dev/null || true
sleep 2

# 3. Check PostgreSQL
echo ""
echo "3️⃣ Checking PostgreSQL..."
if ! pgrep -x "postgres" > /dev/null; then
    echo "   Starting PostgreSQL..."
    sudo systemctl start postgresql 2>/dev/null || sudo service postgresql start 2>/dev/null
    sleep 2
fi

# 4. Fix PostgreSQL auth
echo ""
echo "4️⃣ Fixing PostgreSQL authentication..."
PG_HBA="/var/lib/pgsql/data/pg_hba.conf"
if [ -f "$PG_HBA" ]; then
    sudo cp "$PG_HBA" "$PG_HBA.backup"
    sudo sed -i 's/scram-sha-256/trust/g' "$PG_HBA"
    sudo sed -i 's/ident/trust/g' "$PG_HBA"
    sudo sed -i 's/peer/trust/g' "$PG_HBA"
    sudo sed -i 's/md5/trust/g' "$PG_HBA"
    sudo systemctl restart postgresql 2>/dev/null || sudo service postgresql restart 2>/dev/null
    sleep 2
    echo "   ✅ PostgreSQL auth updated"
fi

# 5. Test database
echo ""
echo "5️⃣ Testing database..."
if psql -U sanliur_sanliurfa -d sanliur_sanliurfa -h localhost -c "SELECT 1" >/dev/null 2>&1; then
    echo "   ✅ Database connection OK"
else
    echo "   ❌ Database connection failed"
    echo "   Trying localhost without -h..."
    if psql -U sanliur_sanliurfa -d sanliur_sanliurfa -c "SELECT 1" >/dev/null 2>&1; then
        echo "   ✅ Connection without -h works"
    fi
fi

# 6. Create tables
echo ""
echo "6️⃣ Creating database tables..."
if [ -f "database/schema.sql" ]; then
    psql -U sanliur_sanliurfa -d sanliur_sanliurfa -h localhost -f database/schema.sql 2>&1 | grep -E "CREATE|INSERT|ERROR" | tail -20
    echo "   ✅ Schema applied"
else
    echo "   ❌ schema.sql not found"
fi

# 7. Update .env.production
echo ""
echo "7️⃣ Updating environment..."
if [ -f ".env.production" ]; then
    # Generate JWT secret if default
    if grep -q "your-super-secret-jwt-key" .env.production; then
        NEW_SECRET=$(openssl rand -base64 32 2>/dev/null || echo "change-this-secret-$(date +%s)")
        sed -i "s/your-super-secret-jwt-key-change-this-in-production/$NEW_SECRET/g" .env.production
        echo "   ✅ JWT_SECRET updated"
    fi
    
    # Ensure DATABASE_URL is set
    if ! grep -q "DATABASE_URL" .env.production; then
        echo "DATABASE_URL=postgresql://sanliur_sanliurfa@localhost:5432/sanliur_sanliurfa" >> .env.production
        echo "   ✅ DATABASE_URL added"
    fi
else
    echo "   ❌ .env.production not found!"
    exit 1
fi

# 8. Rebuild if needed
echo ""
echo "8️⃣ Checking build..."
if [ ! -f "dist/server/entry.mjs" ]; then
    echo "   Building..."
    npm install
    npm run build
fi
echo "   ✅ Build exists"

# 9. Start app
echo ""
echo "9️⃣ Starting application..."
node dist/server/entry.mjs > /tmp/app.log 2>&1 &
sleep 4

# 10. Test
echo ""
echo "🔟 Testing..."
HTTP=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4321/ 2>/dev/null)
if [ "$HTTP" = "200" ]; then
    HTML=$(curl -s http://127.0.0.1:4321/ 2>/dev/null | head -1)
    if echo "$HTML" | grep -qi "html"; then
        echo "   ✅ SUCCESS! Site is working!"
        echo "   Response: $HTML"
    else
        echo "   ⚠️  HTTP 200 but no HTML"
        echo "   Log: $(tail -3 /tmp/app.log)"
    fi
else
    echo "   ❌ HTTP $HTTP"
    echo "   App log:"
    tail -10 /tmp/app.log
fi

# Save to PM2
echo ""
echo "💾 Saving to PM2..."
pkill -f "node dist/server/entry.mjs" 2>/dev/null || true
sleep 1
pm2 start dist/server/entry.mjs --name sanliurfa 2>/dev/null || true
pm2 save 2>/dev/null || true

echo ""
echo "======================"
echo "✅ Fix process completed!"
echo ""
pm2 list 2>/dev/null | grep sanliurfa || echo "PM2 status unavailable"

echo ""
echo "🧪 Run test:"
echo "   curl http://127.0.0.1:4321/"
echo ""
echo "🌐 After Apache restart:"
echo "   http://sanliurfa.com"
