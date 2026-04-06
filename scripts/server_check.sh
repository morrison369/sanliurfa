#!/bin/bash
# Server-side check script
# Run: ssh sanliur@168.119.79.238 -p 77
#      bash /home/sanliur/public_html/scripts/server_check.sh

cd /home/sanliur/public_html
source ~/.nvm/nvm.sh

echo "📋 Server Check"
echo "==============="

echo ""
echo "1️⃣ PM2 Status:"
pm2 list | grep sanliurfa

echo ""
echo "2️⃣ Port 4321:"
ss -tlnp | grep 4321 || netstat -tlnp | grep 4321

echo ""
echo "3️⃣ HTTP Test:"
curl -s -o /dev/null -w "Status: %{http_code}\n" http://127.0.0.1:4321/

echo ""
echo "4️⃣ Recent PM2 Logs:"
pm2 logs sanliurfa --lines 20 2>&1 | tail -20

echo ""
echo "5️⃣ Database Test:"
psql -U sanliur_sanliurfa -d sanliur_sanliurfa -h localhost -c "SELECT count(*) FROM users" 2>&1

echo ""
echo "==============="
