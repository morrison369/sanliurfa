#!/bin/bash
# Fix deployment errors - Run on server
# ssh sanliur@168.119.79.238 -p 77
# bash /home/sanliur/public_html/scripts/server_fix.sh

cd /home/sanliur/public_html
source ~/.nvm/nvm.sh

echo "🔧 Fixing Deployment Errors"
echo "============================"

# 1. Check logs
echo ""
echo "1️⃣ Checking PM2 logs..."
pm2 logs sanliurfa --lines 30 2>&1 | tail -30

# 2. Check database
echo ""
echo "2️⃣ Testing database connection..."
if psql -U sanliur_sanliurfa -d sanliur_sanliurfa -h localhost -c "SELECT 1" >/dev/null 2>&1; then
    echo "   ✅ Database OK"
else
    echo "   ❌ Database connection failed"
    echo "   Trying to fix PostgreSQL auth..."
    
    # Fix pg_hba.conf for local trust auth
    if [ -f "/var/lib/pgsql/data/pg_hba.conf" ]; then
        sudo sed -i 's/scram-sha-256/trust/g' /var/lib/pgsql/data/pg_hba.conf
        sudo sed -i 's/ident/trust/g' /var/lib/pgsql/data/pg_hba.conf
        sudo sed -i 's/peer/trust/g' /var/lib/pgsql/data/pg_hba.conf
        sudo systemctl restart postgresql 2>/dev/null || sudo service postgresql restart 2>/dev/null
        sleep 2
        
        if psql -U sanliur_sanliurfa -d sanliur_sanliurfa -h localhost -c "SELECT 1" >/dev/null 2>&1; then
            echo "   ✅ Database fixed!"
        fi
    fi
fi

# 3. Check tables
echo ""
echo "3️⃣ Checking database tables..."
TABLES=$(psql -U sanliur_sanliurfa -d sanliur_sanliurfa -h localhost -tc "SELECT table_name FROM information_schema.tables WHERE table_schema='public'" 2>/dev/null)

if echo "$TABLES" | grep -q "users"; then
    echo "   ✅ users table exists"
else
    echo "   ❌ users table missing - running schema..."
    psql -U sanliur_sanliurfa -d sanliur_sanliurfa -h localhost -f database/schema.sql 2>&1 | tail -10
fi

if echo "$TABLES" | grep -q "places"; then
    echo "   ✅ places table exists"
else
    echo "   ❌ places table missing"
fi

# 4. Fix .env.production if needed
echo ""
echo "4️⃣ Checking environment..."
if grep -q "your-super-secret-jwt-key" .env.production; then
    echo "   ⚠️  JWT_SECRET is default - generating new one..."
    NEW_SECRET=$(openssl rand -base64 32 2>/dev/null || echo "change-this-secret-key-32chars-long")
    sed -i "s/your-super-secret-jwt-key-change-this-in-production/$NEW_SECRET/g" .env.production
    echo "   ✅ JWT_SECRET updated"
fi

# 5. Restart app
echo ""
echo "5️⃣ Restarting application..."
pm2 stop sanliurfa 2>/dev/null
fuser -k 4321/tcp 2>/dev/null || true
sleep 2

pm2 start dist/server/entry.mjs --name sanliurfa
sleep 3
pm2 save

# 6. Test
echo ""
echo "6️⃣ Testing..."
HTTP=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4321/ 2>/dev/null)
if [ "$HTTP" = "200" ]; then
    HTML=$(curl -s http://127.0.0.1:4321/ 2>/dev/null | head -1)
    if echo "$HTML" | grep -q "html\|HTML"; then
        echo "   ✅ Site is working! HTML response received"
    else
        echo "   ⚠️  HTTP 200 but no HTML - check: pm2 logs sanliurfa"
    fi
else
    echo "   ❌ HTTP $HTTP - check: pm2 logs sanliurfa"
fi

echo ""
echo "============================"
echo "✅ Fix process completed!"
echo ""
pm2 list | grep sanliurfa
