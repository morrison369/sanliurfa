#!/bin/bash
# Simple check - to be run on server
cd /home/sanliur/public_html
source ~/.nvm/nvm.sh 2>/dev/null

echo "=== Quick Status ==="
echo "PM2:"
pm2 list 2>/dev/null | grep sanliurfa || echo "Not running"

echo ""
echo "Port 4321:"
ss -tlnp 2>/dev/null | grep 4321 | head -1 || netstat -tlnp 2>/dev/null | grep 4321 | head -1 || echo "Not listening"

echo ""
echo "HTTP Test:"
curl -s -o /dev/null -w "Status: %{http_code}\n" --max-time 3 http://127.0.0.1:4321/ 2>/dev/null || echo "Failed"

echo ""
echo "Database:"
psql -U sanliur_sanliurfa -d sanliur_sanliurfa -h localhost -c "SELECT count(*) FROM users" 2>/dev/null || echo "Connection failed"

echo ""
echo "Done"
