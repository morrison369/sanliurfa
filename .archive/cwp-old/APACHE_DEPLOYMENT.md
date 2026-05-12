# 🚀 Apache + Node.js Deployment Guide

CentOS Web Panel'de Apache kullanarak Node.js uygulamasını deploy etme.

---

## 📋 Kurulum Adımları

### 1️⃣ **Domain ve User Oluştur (CWP)**

CentOS Web Panel Dashboard:
```
Domains → Add Domain
- Domain: sanliurfa.com
- Username: sanliurfa (yeni user)
- Public HTML: /home/sanliurfa/public
```

### 2️⃣ **Node.js Yükle (SSH)**

```bash
# SSH ile bağlan
ssh sanliurfa@sanliurfa.com

# NVM kur
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc

# Node.js 20 kur
nvm install 20
nvm alias default 20
nvm use 20

# Kontrol et
node --version
npm --version
```

### 3️⃣ **Proje Dosyalarını Yükle**

```bash
cd ~
git clone <repo-url> sanliurfa
cd sanliurfa

# Bağımlılıkları yükle
npm install --legacy-peer-deps

# Environment setup
cat > .env << 'EOF'
NODE_ENV=production
PORT=6000
DATABASE_URL=postgresql://user:pass@localhost:5432/sanliurfa
JWT_SECRET=<random-secret-min-32-chars>
REDIS_URL=redis://localhost:6379
REDIS_KEY_PREFIX=sanliurfa:
VAPID_PUBLIC_KEY=<key>
VAPID_PRIVATE_KEY=<key>
RESEND_API_KEY=<key>
CORS_ORIGINS=https://sanliurfa.com,https://www.sanliurfa.com
EOF

# Build et
npm run build
```

### 4️⃣ **Node.js Uygulamasını Systemd ile Çalıştır**

```bash
# Systemd service dosyası oluştur
sudo cat > /etc/systemd/system/sanliurfa.service << 'EOF'
[Unit]
Description=Şanlıurfa.com Node.js Application
After=network.target
Wants=sanliurfa-restart.timer

[Service]
User=sanliurfa
WorkingDirectory=/home/sanliurfa/sanliurfa
ExecStart=/home/sanliurfa/.nvm/versions/node/v20.*/bin/node /home/sanliurfa/sanliurfa/dist/server/entry.mjs

Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal

Environment="NODE_ENV=production"
Environment="PORT=6000"

[Install]
WantedBy=multi-user.target
EOF

# Systemd reload et
sudo systemctl daemon-reload
sudo systemctl enable sanliurfa
sudo systemctl start sanliurfa

# Status kontrol et
sudo systemctl status sanliurfa

# Logs
sudo journalctl -u sanliurfa -f
```

### 5️⃣ **Apache Proxy Konfigürasyonu (CWP)**

CWP'de domain edit ekranında Apache configuration:

```bash
# CWP: Domains → sanliurfa.com → Edit
# Apache directives kısmına ekle:

# Proxy ayarları
<IfModule mod_proxy.c>
    ProxyPreserveHost On
    ProxyPass / http://127.0.0.1:6000/
    ProxyPassReverse / http://127.0.0.1:6000/

    # WebSocket desteği
    ProxyPass /ws ws://127.0.0.1:6000/ws
    ProxyPassReverse /ws ws://127.0.0.1:6000/ws

    # Timeout
    ProxyTimeout 300
</IfModule>

# Gzip compression
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css text/javascript application/javascript application/json
    DeflateCompressionLevel 6
</IfModule>

# Caching
<IfModule mod_expires.c>
    ExpiresActive On
    ExpiresByType text/css "access plus 30 days"
    ExpiresByType application/javascript "access plus 30 days"
    ExpiresByType image/jpeg "access plus 30 days"
    ExpiresByType image/gif "access plus 30 days"
    ExpiresByType image/png "access plus 30 days"
</IfModule>

# Security headers
<IfModule mod_headers.c>
    Header always set X-Frame-Options "SAMEORIGIN"
    Header always set X-Content-Type-Options "nosniff"
    Header always set X-XSS-Protection "1; mode=block"
    Header always set Referrer-Policy "strict-origin-when-cross-origin"
</IfModule>
```

### 6️⃣ **SSL (Let's Encrypt)**

CWP'de:
```
Domains → sanliurfa.com → Free SSL → Enable Auto-Renewal
```

Veya manual:
```bash
sudo certbot certonly --webroot -w /home/sanliurfa/public -d sanliurfa.com -d www.sanliurfa.com
```

---

## 🔄 Deploy Prosedürü

### Güncellemeleri Deploy Etmek İçin

```bash
# SSH bağlantı
ssh sanliurfa@sanliurfa.com
cd ~/sanliurfa

# Backup al (opsiyonel)
cp -r dist dist.backup

# Kodu güncelle
git pull origin main

# Bağımlılıkları güncelle (gerekirse)
npm install --legacy-peer-deps

# Build et
npm run build

# Aplikasyonu restart et
sudo systemctl restart sanliurfa

# Status kontrol et
sudo systemctl status sanliurfa

# Logs kontrol et
sudo journalctl -u sanliurfa -f -n 50
```

---

## 📊 Monitoring

### Service Status

```bash
# Service durumu
sudo systemctl status sanliurfa

# Service logs (realtime)
sudo journalctl -u sanliurfa -f

# Son 100 satır logs
sudo journalctl -u sanliurfa -n 100

# Error logs
sudo journalctl -u sanliurfa | grep -i error
```

### Health Check

```bash
# Browser
curl https://sanliurfa.com/api/health

# Response:
# {"status":"ok","database":"connected","redis":"connected"}
```

### Performance Monitor

```bash
# Top'la process'i monitor et
top -p $(pgrep -f "node.*entry.mjs")

# Memory usage
ps aux | grep "entry.mjs" | grep -v grep

# Network connections
netstat -an | grep 6000
```

---

## 🔧 Sorun Giderme

| Sorun | Çözüm |
|-------|-------|
| **Service başlamıyor** | `sudo journalctl -u sanliurfa -n 50` kontrol et |
| **502 Bad Gateway** | Node app'ı port 6000'de dinliyor mu? `netstat -an \| grep 6000` |
| **Yavaş response** | Database/Redis bağlantısını kontrol et |
| **Memory leak** | `watch -n 5 'ps aux \| grep entry.mjs'` ile monitor et |
| **SSL error** | `sudo systemctl restart apache2` |

---

## 🚀 Systemd Auto-Restart

Service otomatik restart olsun (crash'te):

```bash
# Service file zaten Restart=on-failure ayarına sahip
# Ek olarak, restart timer kurabilirsin:

sudo cat > /etc/systemd/system/sanliurfa-restart.timer << 'EOF'
[Unit]
Description=Daily restart for sanliurfa service

[Timer]
OnCalendar=daily
OnCalendar=*-*-* 02:00:00
Persistent=true

[Install]
WantedBy=timers.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable sanliurfa-restart.timer
sudo systemctl start sanliurfa-restart.timer
```

---

## 📋 Kontrol Listesi

### Pre-Deploy
- [ ] Git updated
- [ ] .env dosyası ayarlanmış
- [ ] npm audit geçildi
- [ ] Database erişilebilir
- [ ] Redis erişilebilir

### Post-Deploy
- [ ] `sudo systemctl status sanliurfa` → active
- [ ] API health check geçildi
- [ ] Frontend yükleniyor
- [ ] Logs'ta hata yok
- [ ] Performance normal

---

## 🔗 Faydalı Komutlar

```bash
# Service restart
sudo systemctl restart sanliurfa

# Service stop
sudo systemctl stop sanliurfa

# Service start
sudo systemctl start sanliurfa

# Service'yi disable et (otomatik başlamayacak)
sudo systemctl disable sanliurfa

# Logs tail
tail -f /var/log/syslog | grep sanliurfa

# Systemd logs
journalctl -u sanliurfa -f

# Service reload (graceful)
sudo systemctl reload sanliurfa
```

---

## 📞 Support

Sorun olursa:
1. `sudo systemctl status sanliurfa` kontrol et
2. `sudo journalctl -u sanliurfa -n 100` logs'ı oku
3. Database/Redis bağlantısı test et
4. Port 6000 açık mı kontrol et
