#!/bin/bash
# Quick deploy - run on server directly
cd /home/sanliur/public_html

# Fix port in dist files
find dist/server -name '*.mjs' -exec sed -i 's/const port = 4321/const port = 4321/g' {} +

# Kill old
pkill -9 node 2>/dev/null || true
pm2 kill 2>/dev/null || true
fuser -k 4321/tcp 2>/dev/null || true
fuser -k 4321/tcp 2>/dev/null || true
sleep 3

# Create minimal .env
cat > .env << 'EOF'
NODE_ENV=production
PORT=4321
HOST=127.0.0.1
DATABASE_URL=postgresql://sanliur_sanliurfa:CHANGE_ME_DB_PASSWORD@localhost:5432/sanliur_sanliurfa
JWT_SECRET=test-jwt-secret-32chars-minimum
SESSION_SECRET=test-session-secret-32chars
REDIS_URL=redis://127.0.0.1:6381
EOF

# Start
nohup node dist/server/entry.mjs > /tmp/app.log 2>&1 &
sleep 10

# Check
echo "=== HEALTH ==="
curl -s http://127.0.0.1:4321/api/health || echo "HEALTH FAIL"

echo "=== LOG ==="
tail -10 /tmp/app.log

echo "=== PM2 ==="
pm2 delete all 2>/dev/null || true
pm2 start dist/server/entry.mjs --name sanliurfa-app
pm2 save
pm2 list

echo "=== DONE ==="
