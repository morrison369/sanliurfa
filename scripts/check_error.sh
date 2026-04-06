#!/bin/bash
# Check error logs - Run on server

echo "🔍 Checking Error Logs"
echo "======================"

cd /home/sanliur/public_html
source ~/.nvm/nvm.sh 2>/dev/null

echo ""
echo "1️⃣ PM2 Logs:"
pm2 logs sanliurfa --lines 20 2>&1 | tail -20

echo ""
echo "2️⃣ Apache Error Log:"
tail -20 logs/apache-error.log 2>/dev/null || echo "No apache error log"

echo ""
echo "3️⃣ Node Error (direct test):"
node -e "try { require('./dist/server/entry.mjs') } catch(e) { console.log(e.message) }" 2>&1 | head -5

echo ""
echo "4️⃣ Environment Check:"
grep -E "DATABASE_URL|JWT_SECRET" .env.production 2>/dev/null | head -3

echo ""
echo "5️⃣ Database Test:"
psql -U sanliur_sanliurfa -d sanliur_sanliurfa -h localhost -c "SELECT 1" 2>&1

echo ""
echo "======================"
