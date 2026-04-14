# CWP Node.js Deployment Guide (2026 Güncel)

## 🎯 CWP'de Node.js Çalıştırma Yöntemleri (2026)

CWP (CentOS Web Panel) üzerinde Node.js uygulaması çalıştırma için **3 yöntem** var:

### 1. **Nginx → Custom Port** (✅ ÖNERİLEN)
### 2. **Nginx → Varnish → Custom Port** (Cache'li)
### 3. **Nginx → Varnish → Apache → Custom Port** (En kompleks)

**Bu rehber 1. yöntemi (Nginx → Custom Port) anlatacak** - en stabil ve hızlı yöntem.

---

## 📋 Ön Gereksinimler

### CWP Sürüm Kontrolü
```bash
# CWP sürümünü kontrol et
cat /usr/local/cwpsrv/htdocs/resources/config/config.ini | grep version
# veya
cwp -v
```

**Gerekli:** CWP v0.9.8.1141+ (Node.js Selector desteği için)

---

## 🔧 Adım 1: Node.js Kurulumu (CWP Üzerinde)

### Yöntem A: CWP Node.js Selector (En Kolay)

Eğer CWP sürümünüz destekliyorsa:

```bash
# CWP Pro veya güncel sürümlerde
# CWP Admin Panel -> User Accounts -> Manage Users -> [Kullanıcı] -> Node.js Selector

# SSH ile Node.js versiyonlarını listele
ls /opt/alt/

# Node.js 22 kurulumu (sistem geneli)
curl -fsSL https://rpm.nodesource.com/setup_22.x | bash -
yum install -y nodejs

# Kontrol
node --version  # v22.x.x
npm --version   # 10.x.x
```

### Yöntem B: nvm ile Kurulum (Kullanıcı Bazlı)

```bash
# SSH ile kullanıcı hesabına giriş
ssh kullanici@sunucu-ip

# nvm kurulumu
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash

# Shell yeniden yükle
source ~/.bashrc

# Node.js 22 kur
nvm install 22
nvm use 22
nvm alias default 22

# Kontrol
node --version
npm --version
```

---

## 📦 Adım 2: Proje Yükleme ve Build

```bash
# Proje dizinine git
cd /home/kullanici/public_html
# veya alt dizin
cd /home/kullanici/public_html/sanliurfa

# Proje dosyalarını yükle (SFTP/SCP/Git ile)
# Örnek Git ile:
git clone https://github.com/kullanici/sanliurfa.com.git .

# Bağımlılıkları kur
npm ci --omit=dev

# Environment ayarla
cp .env.example .env
nano .env
```

**Örnek .env:**
```env
NODE_ENV=production
PORT=3000
HOST=127.0.0.1
DATABASE_URL=postgresql://user:pass@localhost:5432/sanliurfa
REDIS_URL=redis://localhost:6379
```

### Build Alma
```bash
# Astro build
npm run build

# Çıktı: dist/ dizini
ls -la dist/
# dist/client/  -> Static dosyalar
# dist/server/  -> SSR entry.mjs
```

---

## ⚡ Adım 3: PM2 ile Process Management

```bash
# PM2 global kurulumu (eğer yoksa)
npm install -g pm2

# PM2 ecosystem dosyası oluştur
cat > ecosystem.config.cjs << 'EOF'
module.exports = {
  apps: [{
    name: 'sanliurfa',
    script: './dist/server/entry.mjs',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      HOST: '127.0.0.1'
    },
    log_file: './logs/combined.log',
    out_file: './logs/out.log',
    error_file: './logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    max_memory_restart: '512M',
    restart_delay: 3000,
    max_restarts: 5,
    min_uptime: '10s',
    watch: false,
    ignore_watch: ['node_modules', 'logs', 'dist/client'],
    kill_timeout: 5000,
    listen_timeout: 10000,
  }]
};
EOF

# Log dizini oluştur
mkdir -p logs

# PM2 ile başlat
pm2 start ecosystem.config.cjs --env production

# PM2 durum kontrolü
pm2 status
pm2 logs sanliurfa --lines 20
```

### PM2 Startup Ayarı (Sunucu Yeniden Başlayınca Otomatik)
```bash
# Startup script oluştur
pm2 startup systemd

# Çıkan komutu kopyalayıp çalıştır (root olarak)
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u kullanici --hp /home/kullanici

# PM2 config kaydet
pm2 save

# Sunucu yeniden başlatma testi
sudo reboot
# sonra
pm2 status
```

---

## 🌐 Adım 4: CWP Web Server Yapılandırması

### CWP Admin Panel Adımları:

**1. Giriş:**
```
https://sunucu-ip:2031 (CWP Admin)
```

**2. Navigasyon:**
```
Web Server Settings → Webserver Domain Conf
```

**3. Domain Seçimi:**
```
- Select Username: [kullaniciadi]
- Select Domain: sanliurfa.com (veya subdomain)
```

**4. Configuration Oluşturma:**
```
Create Configuration → Nginx → Custom Port ✅

Settings:
- Domain: sanliurfa.com
- Custom Port: 3000
- IP: 127.0.0.1
- Check: ☑️ Rebuild webserver conf for domain on save

→ Save Changes
```

**5. SSL Kurulumu:**
```
Web Server Settings → SSL Certificates → AutoSSL
- Select User: [kullaniciadi]
- Select Domain: sanliurfa.com
→ Install SSL
```

---

## ⚙️ Adım 5: Nginx Configuration (Manuel Düzenleme)

CWP otomatik oluşturur ama kontrol edelim:

```bash
# Nginx config dosyasını kontrol et
cat /etc/nginx/conf.d/vhosts/sanliurfa.com.conf
```

**Otomatik oluşturulan config örneği:**
```nginx
server {
    listen 80;
    server_name sanliurfa.com www.sanliurfa.com;
    
    # Root dizini (CWP otomatik ayarlar)
    root /home/kullanici/public_html/dist/client;
    index index.html;
    
    # Node.js uygulamasına proxy
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }
    
    # Static dosyalar için cache (opsiyonel optimizasyon)
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
        try_files $uri $uri/ @backend;
    }
    
    # API proxy
    location @backend {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

# HTTPS (SSL)
server {
    listen 443 ssl http2;
    server_name sanliurfa.com www.sanliurfa.com;
    
    ssl_certificate /etc/pki/tls/certs/sanliurfa.com.crt;
    ssl_certificate_key /etc/pki/tls/private/sanliurfa.com.key;
    
    # SSL ayarları
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    root /home/kullanici/public_html/dist/client;
    
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**Nginx test ve reload:**
```bash
# Config test
nginx -t

# Nginx reload (CWP üzerinden veya CLI)
systemctl reload nginx
# veya CWP: Web Server Settings → Select Web Server → Nginx → Restart
```

---

## 🗄️ Adım 6: PostgreSQL Veritabanı (CWP Üzerinde)

```bash
# PostgreSQL kurulu mu kontrol et
which psql

# Değilse kurulum
yum install -y postgresql15-server postgresql15-contrib
/usr/pgsql-15/bin/postgresql-15-setup initdb
systemctl enable postgresql-15
systemctl start postgresql-15

# Veritabanı oluştur
sudo -u postgres psql << EOF
CREATE DATABASE sanliurfa;
CREATE USER sanliurfa_user WITH ENCRYPTED PASSWORD 'Guclu_Sifre_2026!';
GRANT ALL PRIVILEGES ON DATABASE sanliurfa TO sanliurfa_user;
\q
EOF

# Migrations çalıştır
cd /home/kullanici/public_html
npm run db:migrate
```

---

## 🔄 Güncelleme (Deploy) Süreci

```bash
# 1. SSH bağlan
ssh kullanici@sunucu-ip

# 2. Dizine git
cd /home/kullanici/public_html

# 3. Uygulamayı durdur
pm2 stop sanliurfa

# 4. Güncellemeleri çek (Git ile)
git pull origin main

# 5. Bağımlılıkları güncelle
npm ci --omit=dev

# 6. Yeni build al
npm run build

# 7. Migrations (gerekirse)
npm run db:migrate

# 8. Başlat
pm2 start ecosystem.config.cjs --env production

# 9. Kontrol
pm2 status
pm2 logs sanliurfa --lines 50
```

---

## 🛠️ Sorun Giderme

### 1. "Port 3000 already in use"
```bash
# Process'i bul
lsof -i :3000

# veya netstat
netstat -tulpn | grep 3000

# Öldür
kill -9 <PID>

# PM2 ile temizle
pm2 delete all
pm2 start ecosystem.config.cjs
```

### 2. "502 Bad Gateway" (Nginx hatası)
```bash
# Node.js çalışıyor mu kontrol et
pm2 status
pm2 logs sanliurfa

# Port dinleniyor mu
netstat -tulpn | grep 3000

# Nginx error log
tail -f /var/log/nginx/error.log
```

### 3. "Permission denied"
```bash
# Dosya izinleri
chown -R kullanici:kullanici /home/kullanici/public_html
chmod -R 755 /home/kullanici/public_html

# SELinux (varsa)
setenforce 0  # veya düzgün yapılandır
```

### 4. PM2 "Permission denied" hatası
```bash
# PM2 home dizinini ayarla
export PM2_HOME=/home/kullanici/.pm2
pm2 start ecosystem.config.cjs
```

---

## 📊 Monitoring

```bash
# PM2 monitör
pm2 monit

# Logları izle
pm2 logs sanliurfa --lines 100 --timestamp

# Sistem kaynakları
htop
free -m
df -h

# Nginx erişim logları
tail -f /var/log/nginx/access.log | grep sanliurfa.com
```

---

## ✅ Deployment Kontrol Listesi

- [ ] Node.js 22+ kurulu (`node --version`)
- [ ] Proje dosyaları `/home/kullanici/public_html` altında
- [ ] `npm ci --omit=dev` çalıştırıldı
- [ ] `npm run build` başarılı
- [ ] `.env` dosyası ayarlandı
- [ ] PM2 başlatıldı (`pm2 start`)
- [ ] Port 3000 dinleniyor (`netstat -tulpn`)
- [ ] CWP Nginx Custom Port yapılandırıldı
- [ ] SSL sertifikası kuruldu
- [ ] PostgreSQL veritabanı oluşturuldu
- [ ] Migrations çalıştırıldı
- [ ] PM2 startup ayarlandı
- [ ] Site HTTPS üzerinden erişilebilir

---

## 🎯 Sonuç

Bu yöntemle CWP shared hosting üzerinde:
- ✅ Node.js 22 çalışıyor
- ✅ Nginx reverse proxy (en hızlı)
- ✅ PM2 process management
- ✅ SSL/HTTPS aktif
- ✅ Auto-start ayarlı

**Artık deploy edebilirsiniz! 🚀**

---

*Kaynaklar:*
- CWP Wiki: https://wiki.centos-webpanel.com/how-to-install-and-setup-node-js-on-cwp
- CWP Forum: https://forum.centos-webpanel.com/
- NodeSource: https://rpm.nodesource.com/
