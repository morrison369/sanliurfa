#!/bin/bash
# Şanlıurfa.com - CWP Shared Hosting PM2 Başlatma Scripti
# Kullanım: bash scripts/pm2-cwp-start.sh
# NOT: Root yetkisi gerektirmez, user olarak çalıştırılır

PM2_NAME="sanliurfa-app"
APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
LOG_DIR="$APP_DIR/logs"

echo "🚀 Şanlıurfa.com PM2 Başlatılıyor..."

# Log dizini oluştur
mkdir -p "$LOG_DIR"

# Node.js versiyonunu kontrol et
NODE_VERSION=$(node -v 2>/dev/null | cut -d'v' -f2 | cut -d'.' -f1)
if [ -z "$NODE_VERSION" ] || [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js 18+ gerekiyor!"
    echo "📋 CWP Panel → Software → Node.js Selector'dan Node.js 22'yi seçin."
    exit 1
fi

echo "✅ Node.js v$(node -v) bulundu"

# PM2 kurulu mu kontrol et
if ! command -v pm2 &> /dev/null; then
    echo "📦 PM2 kuruluyor..."
    npm install -g pm2
fi

echo "✅ PM2 v$(pm2 -v) bulundu"

# .env dosyası kontrolü
if [ ! -f "$APP_DIR/.env" ]; then
    echo "⚠️ .env dosyası bulunamadı!"
    echo "📋 .env.example dosyasını .env olarak kopyalayıp düzenleyin:"
    echo "   cp $APP_DIR/.env.example $APP_DIR/.env"
    exit 1
fi

# Build kontrolü
if [ ! -d "$APP_DIR/dist" ]; then
    echo "🔨 Build oluşturuluyor..."
    cd "$APP_DIR"
    npm install --legacy-peer-deps
    npm run build
fi

# Mevcut PM2 sürecini durdur
pm2 delete $PM2_NAME 2>/dev/null

# PM2'yi başlat
echo "🔄 PM2 başlatılıyor..."
pm2 start "$APP_DIR/ecosystem.config.cjs" --name $PM2_NAME

# PM2'yi kullanıcı oturumu başladığında otomatik başlat
pm2 save
pm2 startup 2>/dev/null || echo "⚠️ 'pm2 startup' komutunu manuel çalıştırmanız gerekebilir"

echo ""
echo "📊 PM2 Durumu:"
pm2 status

echo ""
echo "📋 Logları görüntülemek için:"
echo "   pm2 logs $PM2_NAME"
echo ""
echo "🔄 Yeniden başlatmak için:"
echo "   pm2 restart $PM2_NAME"
echo ""
echo "🛑 Durdurmak için:"
echo "   pm2 stop $PM2_NAME"
