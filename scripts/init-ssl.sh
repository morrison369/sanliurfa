#!/bin/bash
# SSL Sertifikası Oluşturma Scripti (Let's Encrypt)

set -e

DOMAIN=${DOMAIN:-sanliurfa.com}
EMAIL=${EMAIL:-admin@sanliurfa.com}

# Renkli output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🔒 SSL Sertifikası Kurulumu${NC}"
echo "Domain: $DOMAIN"
echo "Email: $EMAIL"
echo ""

# Certbot kontrol
if ! command -v certbot &> /dev/null; then
    echo -e "${YELLOW}Certbot yükleniyor...${NC}"
    apt-get update
    apt-get install -y certbot
fi

# Dizinleri oluştur
mkdir -p ./ssl
mkdir -p ./certbot/www

# Geçici sertifika oluştur (nginx başlayabilmesi için)
echo -e "${YELLOW}📄 Geçici sertifika oluşturuluyor...${NC}"
openssl req -x509 -nodes -newkey rsa:2048 \
    -keyout ./ssl/privkey.pem \
    -out ./ssl/fullchain.pem \
    -subj "/CN=$DOMAIN" \
    -days 1

# Docker başlat
echo -e "${YELLOW}🐳 Docker container'ları başlatılıyor...${NC}"
docker-compose up -d nginx

# Certbot ile gerçek sertifika al
echo -e "${YELLOW}🔐 Let's Encrypt sertifikası alınıyor...${NC}"
docker-compose run --rm certbot certonly \
    --webroot \
    --webroot-path /var/www/certbot \
    --email $EMAIL \
    --agree-tos \
    --no-eff-email \
    -d $DOMAIN \
    -d www.$DOMAIN

# Sertifikaları kopyala
echo -e "${YELLOW}📂 Sertifikalar kopyalanıyor...${NC}"
cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem ./ssl/
cp /etc/letsencrypt/live/$DOMAIN/privkey.pem ./ssl/

# Nginx yeniden yükle
echo -e "${YELLOW}🔄 Nginx yeniden yükleniyor...${NC}"
docker-compose exec nginx nginx -s reload

echo -e "${GREEN}✅ SSL sertifikası başarıyla kuruldu!${NC}"
echo ""
echo "Otomatik yenileme için cron job ekleyin:"
echo "0 0 * * * cd $(pwd) && docker-compose run --rm certbot renew && docker-compose exec nginx nginx -s reload"
