#!/bin/bash
# Şanlıurfa.com - CWP Shared Hosting Deploy Script
# Kullanım: bash scripts/deploy-shared.sh
# NOT: Root yetkisi gerektirmez! CWP user hesabıyla çalıştırılır.

set -e

# Konfigürasyon
APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PM2_NAME="sanliurfa-app"
BACKUP_DIR="$APP_DIR/backups"
LOG_DIR="$APP_DIR/logs"

# Renkli çıktı
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}🚀 Şanlıurfa.com CWP Shared Hosting Deploy${NC}"
echo "📂 Dizin: $APP_DIR"
echo ""

# 1. Yedek alma
echo -e "${YELLOW}📦 Yedek alınıyor...${NC}"
mkdir -p "$BACKUP_DIR"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
if [ -d "$APP_DIR/dist" ]; then
    cp -r "$APP_DIR/dist" "$BACKUP_DIR/dist_$TIMESTAMP"
    echo "✅ Yedek: dist_$TIMESTAMP"
fi

# 2. Git pull (repo varsa)
if [ -d "$APP_DIR/.git" ]; then
    echo -e "${YELLOW}📦 Kod güncelleniyor...${NC}"
    cd "$APP_DIR"
    git pull origin main 2>/dev/null || echo "⚠️ Git pull başarısız, devam ediliyor"
fi

# 3. Bağımlılıkları yükle
echo -e "${YELLOW}📦 Bağımlılıklar kontrol ediliyor...${NC}"
cd "$APP_DIR"
npm install --legacy-peer-deps --production 2>&1 | tail -5

# 4. Build
echo -e "${YELLOW}🔨 Build oluşturuluyor...${NC}"
npm run build 2>&1 | tail -10

# 5. PM2 restart
echo -e "${YELLOW}🔄 PM2 yeniden başlatılıyor...${NC}"
pm2 restart $PM2_NAME 2>/dev/null || {
    echo "⚠️ PM2 süreci bulunamadı, başlatılıyor..."
    pm2 start "$APP_DIR/ecosystem.config.cjs" --name $PM2_NAME
}

# 6. Sağlık kontrolü
echo -e "${YELLOW}🏥 Sağlık kontrolü...${NC}"
sleep 3

# Portu ecosystem.config.cjs'den al
PORT=$(grep -oP 'PORT[=:]\s*\K[0-9]+' "$APP_DIR/ecosystem.config.cjs" 2>/dev/null || echo "6000")

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:$PORT/api/health" 2>/dev/null || echo "000")

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ Deployment başarılı! (HTTP $HTTP_CODE)${NC}"
    echo "🌐 Site: https://sanliurfa.com"
    echo "🏥 Health: http://127.0.0.1:$PORT/api/health"
else
    echo -e "${RED}❌ Deployment başarısız! (HTTP $HTTP_CODE)${NC}"
    echo "📋 Son loglar:"
    pm2 logs $PM2_NAME --lines 20 --nostream 2>/dev/null
    echo ""
    echo "⚠️ Yedekten geri yüklemek için:"
    echo "   rm -rf dist && cp -r $BACKUP_DIR/dist_$TIMESTAMP dist"
    echo "   pm2 restart $PM2_NAME"
    exit 1
fi

echo ""
echo -e "${GREEN}✅ İşlem tamamlandı!${NC}"
