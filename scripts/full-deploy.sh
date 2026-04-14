#!/bin/bash
set -e

DIR=/home/sanliur/public_html

echo "=== CLEAN ==="
fuser -k 6000/tcp 2>/dev/null || true
fuser -k 4321/tcp 2>/dev/null || true
pm2 delete all 2>/dev/null || true
pm2 kill 2>/dev/null || true
sleep 2

echo "=== CHECK PORT ==="
ss -tulpn | grep 6000 && { echo "PORT STILL IN USE!"; exit 1; } || echo "Port 6000 FREE"

echo "=== START ==="
cd $DIR
NODE_ENV=production PORT=6000 nohup node dist/server/entry.mjs > /tmp/app.log 2>&1 &
sleep 10

echo "=== HEALTH ==="
curl -sf http://127.0.0.1:6000/api/health && echo "" || { echo "FAIL"; tail -20 /tmp/app.log; exit 1; }

echo "=== PM2 ==="
pm2 start dist/server/entry.mjs --name sanliurfa-app
pm2 save

echo "=== DONE ==="
