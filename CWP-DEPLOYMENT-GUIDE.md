# Şanlıurfa.com - CWP Deployment Rehberi
# CWP (CentOS Web Panel) + Apache + Node.js kurulum adımları

## 1. Sunucu Hazırlığı

```bash
# Sunucuya SSH ile bağlan
ssh root@sanliurfa.com

# Sistem güncellemeleri
yum update -y

# Node.js 22 kurulumu
curl -fsSL https://rpm.nodesource.com/setup_22.x | sudo bash -
yum install -y nodejs

# PM2 kurulumu
npm install -g pm2

# Git kurulumu
yum install -y git
```

## 2. CWP'de Domain Ekleme

1. CWP Admin Panel → **WebServer Settings** → **New Account**
2. Domain: `sanliurfa.com`
3. Paket: `default`
4. **Create** butonuna tıkla

## 3. Uygulama Kurulumu

```bash
# Dizin oluştur
mkdir -p /home/sanliurfa/public_html
cd /home/sanliurfa/public_html

# Repoyu klonla
git clone https://github.com/kullanici/sanliurfa.com.git .
# veya
git pull origin main

# Bağımlılıkları yükle
npm install --legacy-peer-deps --production

# .env dosyasını oluştur
cat > .env << EOF
NODE_ENV=production
PORT=6000
DATABASE_URL=postgresql://sanliurfa_db_user:STRONG_PASSWORD@localhost:5432/sanliurfa_db
JWT_SECRET=$(openssl rand -base64 48)
REDIS_URL=redis://localhost:6379
SITE_URL=https://sanliurfa.com
CORS_ORIGINS=https://sanliurfa.com
EOF

# .env izinlerini ayarla
chmod 600 .env

# Build oluştur
npm run build
```

## 4. Apache Yapılandırması

`.htaccess` dosyası zaten proje kök dizininde mevcut. CWP bunu otomatik okuyacaktır.

Apache modüllerinin aktif olduğundan emin olun:
```bash
# httpd.conf kontrolü
grep -E "mod_proxy|mod_rewrite|mod_headers|mod_deflate|mod_expires" /usr/local/apache/conf/httpd.conf

# Eksik modülleri yükle (CWP genellikle hepsini kurar)
```

## 5. PM2 ile Başlatma

```bash
# PM2 başlat
pm2 start ecosystem.config.cjs --name sanliurfa-app

# PM2'yi başlangıca ekle
pm2 startup
pm2 save

# Durumu kontrol et
pm2 status
pm2 logs sanliurfa-app
```

## 6. Firewall Ayarları

```bash
# Port 6000'i sadece localhost'tan aç (Apache reverse proxy kullanıyoruz)
firewall-cmd --permanent --add-port=6000/tcp
firewall-cmd --reload

# Port 80 ve 443 zaten CWP tarafından açılmış olmalı
```

## 7. Veritabanı Kurulumu

1. CWP → **SQL Services** → **MySQL Manager**
2. Yeni veritabanı oluştur: `sanliurfa_db`
3. Kullanıcı oluştur: `sanliurfa_db_user`
4. Şifreyi `.env` dosyasına kaydet

## 8. Seed Verilerini Yükle

```bash
# Seed script'i çalıştır
npx tsx scripts/seed-all.ts
```

## 9. SSL Sertifikası

SSL zaten yüklü. Let's Encrypt ile yenileme:
```bash
# CWP otomatik yeniler, manuel kontrol:
/usr/local/cwpsrv/htdocs/resources/scripts/generate_ssl_user_domains.sh sanliurfa
```

## 10. Doğrulama

```bash
# Sağlık kontrolü
curl -f http://127.0.0.1:6000/api/health

# HTTPS kontrolü
curl -fI https://sanliurfa.com

# İçerik kontrolü
curl -s https://sanliurfa.com | head -20
```

## Deployment (Her Güncelleme Sonrası)

```bash
cd /home/sanliurfa/public_html
git pull origin main
npm install --legacy-peer-deps --production
npm run build
pm2 restart sanliurfa-app
```

veya deploy script'ini kullan:
```bash
bash scripts/deploy-cwp.sh
```

## Sorun Giderme

### Uygulama Başlamıyor
```bash
# PM2 loglarını kontrol et
pm2 logs sanliurfa-app --lines 50

# Port çakışması kontrolü
netstat -tulpn | grep 6000

# Node.js versiyonu
node -v  # 22.x olmalı
```

### Apache Proxy Hatası
```bash
# Apache hata logları
tail -f /usr/local/apache/logs/error_log

# .htaccess syntax kontrolü
apachectl configtest
```
