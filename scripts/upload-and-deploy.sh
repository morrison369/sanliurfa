#!/bin/bash
set -e

HOST="168.119.79.238"
PORT="77"
USER="sanliur"
PASS="zIT7Y9yrJZRV"
DIR="/home/sanliur/public_html"

echo "=== Uploading dist ==="
scp -r -o StrictHostKeyChecking=no -P $PORT dist ${USER}@${HOST}:${DIR}/

echo "=== Uploading .env ==="
scp -o StrictHostKeyChecking=no -P $PORT .env.production ${USER}@${HOST}:${DIR}/.env

echo "=== Uploading .htaccess ==="
scp -o StrictHostKeyChecking=no -P $PORT .htaccess ${USER}@${HOST}:${DIR}/.htaccess

echo "=== Deploying ==="
sshpass -p "$PASS" ssh -o StrictHostKeyChecking=no -p $PORT ${USER}@${HOST} "
pkill -9 node 2>/dev/null || true
pm2 kill 2>/dev/null || true
fuser -k 6000/tcp 2>/dev/null || true
sleep 2

cd $DIR
cat .env | grep DATABASE_URL

nohup node dist/server/entry.mjs > /tmp/app.log 2>&1 &
sleep 10

curl -s http://127.0.0.1:6000/api/health
echo

tail -10 /tmp/app.log

pm2 start dist/server/entry.mjs --name sanliurfa-app 2>/dev/null || true
pm2 save 2>/dev/null || true
pm2 list
"

echo "=== DONE ==="
