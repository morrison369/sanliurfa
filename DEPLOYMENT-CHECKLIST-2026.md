# 🚀 Şanlıurfa.com - Deployment Checklist 2026

> **Son Güncelleme:** 2026-04-13  
> **Build Süresi:** 10.57s ✅  
> **Build Durumu:** BAŞARILI ✅

---

## ✅ Pre-Deployment Kontrolü (Tamamlandı)

### Kod Kalitesi
- [x] Build başarılı (`npm run build` → 10.57s)
- [x] Lucide React tamamen temizlendi (27 dosya, ~119 ikon → SVG inline)
- [x] Türkçe-only kuralı uygulandı (hreflang tag'leri kaldırıldı)
- [x] Profile modülü tamamlandı (6 sayfa + 3 API endpoint)
- [x] Blog sayfaları tip uyumlu
- [x] SchemaOrg tipleri düzeltildi
- [x] Kullanılmayan import'lar temizlendi
- [x] PhotoUpload.tsx duplicate satır düzeltildi

### Güvenlik
- [x] JWT auth middleware çalışıyor
- [x] Rate limiting aktif (100 req/15dk)
- [x] CORS yapılandırması tanımlı
- [x] CSP header'ları mevcut
- [x] SQL injection koruması (parameterized queries)
- [x] .env dosyaları gitignore'da

### Performans
- [x] 78 JS dosyası sıkıştırıldı (6.33 KB)
- [x] 2 CSS dosyası sıkıştırıldı (3.34 KB)
- [x] Sitemap otomatik oluşturuluyor
- [x] SSR mode aktif (Astro Node adapter)

---

## 📋 Production Deployment Adımları

### 1. Ortam Hazırlığı

```bash
# Sunucuya SSH ile bağlan
ssh deploy@sanliurfa.com

# Proje dizinine git
cd /home/sanliurfa.com

# .env dosyasını oluştur (sadece gerekli değişkenler)
cat > .env << 'EOF'
DATABASE_URL=postgresql://sanliurfa:STRONG_PASSWORD@localhost:5432/sanliurfa
JWT_SECRET=$(openssl rand -base64 48)
REDIS_URL=redis://localhost:6379
NODE_ENV=production
PORT=6000
SITE_URL=https://sanliurfa.com
CORS_ORIGINS=https://sanliurfa.com
EOF

# .env dosyası izinlerini ayarla (sadece owner okuyabilsin)
chmod 600 .env
```

### 2. Uygulamayı Deploy Et

```bash
# Repoyu çek/güncelle
git pull origin main

# Bağımlılıkları yükle
npm install --legacy-peer-deps --production

# Build oluştur
npm run build

# PM2 ile başlat (ilk kurulum)
pm2 start ecosystem.config.cjs --env production

# PM2 startup'a ekle (sistem yeniden başlatıldığında otomatik başlasın)
pm2 startup
pm2 save

# Durumu kontrol et
pm2 status
pm2 logs sanliurfa --lines 50
```

### 3. Nginx Reverse Proxy Yapılandırması

```nginx
# /etc/nginx/conf.d/sanliurfa.com.conf
server {
    listen 80;
    server_name sanliurfa.com www.sanliurfa.com;

    # HTTPS'e yönlendir
    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name sanliurfa.com www.sanliurfa.com;

    # SSL sertifikası (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/sanliurfa.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/sanliurfa.com/privkey.pem;

    # Güvenlik ayarları
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Reverse proxy
    location / {
        proxy_pass http://127.0.0.1:6000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Statik dosyalar (opsiyonel - Astro'dan serve edilebilir)
    location /_astro/ {
        proxy_pass http://127.0.0.1:6000;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

```bash
# Nginx yapılandırmasını test et
nginx -t

# Nginx'i yeniden yükle
systemctl reload nginx

# SSL sertifikası al (Let's Encrypt)
certbot --nginx -d sanliurfa.com -d www.sanliurfa.com
```

### 4. Veritabanı Hazırlığı

```bash
# PostgreSQL'e bağlan
psql -U sanliurfa -d sanliurfa

# Gerekli extension'ları oluştur
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

# Migration'ları çalıştır (eğer henüz çalıştırılmadıysa)
# Uygulama başlatıldığında otomatik çalışacaktır
```

### 5. Redis Kurulumu

```bash
# Redis kurulu mu kontrol et
redis-cli ping  # "PONG" dönmeli

# Değilse kur
# CentOS/RHEL:
yum install redis
systemctl enable redis
systemctl start redis
```

---

## 🔍 Post-Deployment Doğrulama

### Health Check
```bash
# Uygulama çalışıyor mu?
curl -f http://localhost:6000/api/health

# HTTPS çalışyor mu?
curl -f https://sanliurfa.com/api/health

# SSL geçerli mi?
curl -vI https://sanliurfa.com 2>&1 | grep "SSL certificate verify"
```

### Temel Sayfalar
```bash
# Ana sayfa
curl -sI https://sanliurfa.com | head -1  # HTTP/2 200

# Blog
curl -sI https://sanliurfa.com/blog | head -1  # HTTP/2 200

# Profil (auth gerektirir, 302 login'e yönlendirmeli)
curl -sI https://sanliurfa.com/profil | head -1  # HTTP/2 302

# Admin (auth gerektirir)
curl -sI https://sanliurfa.com/admin | head -1  # HTTP/2 302
```

### Performans Testi
```bash
# Lighthouse CI ile test
npx lighthouse https://sanliurfa.com \
  --output html \
  --output-path ./lighthouse-report.html \
  --only-categories=performance,accessibility,best-practices,seo
```

---

## 📊 Monitoring & Bakım

### PM2 Monitoring
```bash
# Süreç durumu
pm2 status

# Logları izle
pm2 logs sanliurfa

# Kaynak kullanımı
pm2 monit

# Restart
pm2 restart sanliurfa

# Stop
pm2 stop sanliurfa
```

### Veritabanı Yedekleme
```bash
# Manuel yedek al
pg_dump -U sanliurfa sanliurfa > backup_$(date +%Y%m%d).sql

# Otomatik yedekleme (cron)
0 2 * * * pg_dump -U sanliurfa sanliurfa | gzip > /backups/sanliurfa_$(date +\%Y\%m\%d).sql.gz
```

### Güncelleme Prosedürü
```bash
# 1. Yeni kodu çek
git pull origin main

# 2. Bağımlılıkları güncelle
npm install --legacy-peer-deps

# 3. Build oluştur
npm run build

# 4. PM2 ile yeniden başlat (zero-downtime)
pm2 reload sanliurfa

# 5. Sağlık kontrolü
curl -f http://localhost:6000/api/health
```

---

## 🚨 Acil Durum Prosedürleri

### Uygulama Çöktüğünde
```bash
# PM2 otomatik yeniden başlatır (config'de tanımlı)
# Manuel restart gerekirse:
pm2 restart sanliurfa

# Logları kontrol et
pm2 logs sanliurfa --err --lines 100
```

### Veritabanı Bağlantı Hatası
```bash
# PostgreSQL durumunu kontrol et
systemctl status postgresql

# Bağlantıyı test et
psql -U sanliurfa -d sanliurfa -c "SELECT 1"

# Gerekirse yeniden başlat
systemctl restart postgresql
```

### SSL Sertifika Süresi Dolmak Üzere
```bash
# Sertifika durumunu kontrol et
certbot certificates

# Yenile
certbot renew --dry-run  # Test
certbot renew            # Gerçek yenileme
```

---

## 📝 Notlar

- **Port:** 6000 (astro.config.mjs'de tanımlı)
- **Node.js:** 22.12.0 (.nvmrc)
- **PM2:** fork mode (CWP shared hosting uyumlu)
- **Max Memory:** 512MB (PM2 config'de tanımlı)
- **Log Rotasyonu:** 10MB max, 7 gün saklama

---

*Bu checklist 2026-04-13 tarihinde oluşturulmuştur. Her deployment sonrası güncellenmelidir.*
