#!/bin/bash
# Şanlıurfa.com - CWP Deployment Script
# Sunucuda çalıştır: bash scripts/deploy-cwp.sh

set -e

APP_DIR="/home/sanliurfa/public_html"
PM2_NAME="sanliurfa"
PORT=6000

echo "🚀 Şanlıurfa.com CWP Deployment Başlatılıyor..."

# 1. Uygulama dizinine git
cd "$APP_DIR" || exit 1
echo "📂 Dizin: $(pwd)"

# 2. Son kodları çek
echo "📦 Git pull..."
git pull origin main

# 3. Bağımlılıkları yükle
echo "📦 npm install..."
npm install --legacy-peer-deps --production

# 4. Build oluştur
echo "🔨 Build..."
npm run build

# 5. PM2'yi yeniden başlat
echo "🔄 PM2 restart..."
pm2 restart $PM2_NAME 2>/dev/null || pm2 start ecosystem.config.cjs --name $PM2_NAME

# 6. PM2 yapılandırmasını kaydet
pm2 save

# 7. Sağlık kontrolü
echo "🏥 Sağlık kontrolü..."
sleep 3
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:$PORT/api/health)

if [ "$HTTP_STATUS" = "200" ]; then
    echo "✅ Deployment başarılı! (HTTP $HTTP_STATUS)"
    echo "🌐 Site: https://sanliurfa.com"
else
    echo "❌ Sağlık kontrolü başarısız! (HTTP $HTTP_STATUS)"
    echo "📋 PM2 Logs:"
    pm2 logs $PM2_NAME --lines 20 --nostream
    exit 1
fi

echo "✅ İşlem tamamlandı!"
