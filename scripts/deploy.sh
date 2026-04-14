#!/bin/bash
# Sanliurfa.com - Tek Tıkla Deploy Scripti
# Sunucuda çalıştırın: bash /home/sanliur/public_html/scripts/deploy.sh

set -e
DIR="/home/sanliur/public_html"

echo "========================================"
echo "SANLIURFA.COM - DEPLOY BASLATILIYOR"
echo "========================================"

echo "[1/6] Eski prosesler temizleniyor..."
pkill -9 -f "node dist" 2>/dev/null || true
pm2 delete all 2>/dev/null || true
pm2 kill 2>/dev/null || true
sleep 3

echo "[2/6] Portlar temizleniyor..."
fuser -k 6000/tcp 2>/dev/null || true
fuser -k 4321/tcp 2>/dev/null || true
sleep 2

echo "[3/6] Port kontrolu..."
if ss -tlnp | grep -q 6000; then
    echo "HATA: Port 6000 hala kullanımda!"
    exit 1
fi
echo "Port 6000 bosta"

echo "[4/6] Uygulama baslatiliyor..."
cd $DIR
NODE_ENV=production PORT=6000 nohup node dist/server/entry.mjs > /tmp/app.log 2>&1 &
sleep 12

echo "[5/6] Saglik kontrolu..."
HEALTH=$(curl -sf http://127.0.0.1:6000/api/health 2>&1 || echo "FAIL")
echo "$HEALTH"

if echo "$HEALTH" | grep -q "healthy"; then
    echo "[6/6] PM2 ile kaydediliyor..."
    pm2 start dist/server/entry.mjs --name sanliurfa-app
    pm2 save
    echo ""
    echo "========================================"
    echo "✅ DEPLOY BASARILI!"
    echo "========================================"
    echo "Site: https://sanliurfa.com"
    echo "Health: http://127.0.0.1:6000/api/health"
    pm2 list
else
    echo ""
    echo "========================================"
    echo "❌ DEPLOY BASARISIZ!"
    echo "========================================"
    echo "Loglar:"
    tail -30 /tmp/app.log
    exit 1
fi
