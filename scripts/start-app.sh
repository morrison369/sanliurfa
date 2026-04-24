#!/bin/bash
# Sanliurfa.com - Start App Script

echo "1. Cleaning up old processes..."
pkill -9 -f "node dist" 2>/dev/null
pm2 delete all 2>/dev/null
pm2 kill 2>/dev/null
sleep 3

echo "2. Checking port 4321..."
if ss -tulpn | grep -q 4321; then
    echo "ERROR: Port 4321 still in use!"
    exit 1
fi
echo "Port 4321 is free"

echo "3. Starting application..."
cd /home/sanliur/public_html
nohup node dist/server/entry.mjs > /tmp/app.log 2>&1 &
APP_PID=$!
echo "PID: $APP_PID"

echo "4. Waiting for startup..."
sleep 8

echo "5. Checking status..."
if pgrep -f "node dist" > /dev/null; then
    echo "Process: RUNNING"
else
    echo "Process: NOT RUNNING"
fi

echo "6. Port check..."
ss -tulpn | grep 4321 || echo "PORT: NOT LISTENING"

echo "7. Health check..."
curl -s http://127.0.0.1:4321/api/health 2>&1 || echo "HEALTH: FAILED"

echo "8. App log (last 15 lines)..."
tail -15 /tmp/app.log

echo "9. Starting PM2 for management..."
cd /home/sanliur/public_html
pm2 start dist/server/entry.mjs --name sanliurfa-app -- --env production 2>/dev/null
pm2 save

echo "DONE!"
