# CWP (CentOS Web Panel) Apache Node.js Deployment Rehberi

## 🔴 ÖNEMLİ: SSH Erişim Kontrolü

Önce sunucuna SSH ile bağlanmayı dene:

```bash
ssh -p 77 sanliur@176.9.138.254
# Şifre: CHANGE_ME_CWP_SSH_PASSWORD
```

**Bağlanamazsan:**
1. CWP Panel üzerinden SSH erişimini kontrol et
2. Şifreyi CWP panelden sıfırla
3. Alternatif olarak CWP File Manager kullan

---

## 📋 CWP + Apache + Node.js Deployment Planı

### Adım 1: Node.js Kurulumu (Root Gerekir)

**Not:** CWP shared hosting'de root erişimin yoksa, hosting sağlayıcısından Node.js kurulumunu istemen gerekir.

Eğer root/sudo erişimin varsa:

```bash
# SSH ile root olarak bağlan
ssh -p 77 root@176.9.138.254

# Development Tools kur
yum groupinstall 'Development Tools' -y

# Node.js 22 LTS kur
curl -sL https://rpm.nodesource.com/setup_22.x | bash -
yum install -y nodejs

# Kontrol et
node -v  # v22.x.x
npm -v   # 10.x.x
```

### Adım 2: CWP Panel'de Domain Yapılandırması

1. **CWP Panel'e giriş:**
   - URL: `https://176.9.138.254:2083` veya `https://sunucu-adiniz:2083`
   - Kullanıcı: `sanliur`
   - Şifre: Hosting şifren

2. **Webserver Domain Conf Ayarı:**
   - Sol menü: `Webserver Settings` → `Webserver Domain Conf`
   - Kullanıcı seç: `sanliur`
   - Domain seç: `sanliurfa.com` veya kullanacağın domain
   - Yapılandırma seç: **Apache → Custom Port** ⭐
   - Port: `3000` (veya 3001, 3002 vb.)
   - IP: `127.0.0.1`
   - ✅ `Rebuild webserver conf for domain on save` işaretle
   - Kaydet

3. **vHost Manuel Düzenleme (Gerekirse):**
   
   CWP Panel → `Webserver Settings` → `Webservers Conf Editor`
   
   Dosya: `/etc/apache2/conf.d/vhosts/sanliurfa.com.conf`
   
   Aşağıdaki satırları ekle:

```apache
<VirtualHost *:80>
    ServerName sanliurfa.com
    ServerAlias www.sanliurfa.com
    DocumentRoot /home/sanliur/public_html
    
    # Node.js Reverse Proxy
    ProxyRequests Off
    <Proxy *>
        Require all granted
    </Proxy>
    
    ProxyPass / http://127.0.0.1:3000/
    ProxyPassReverse / http://127.0.0.1:3000/
    
    # WebSocket desteği (gerekirse)
    RewriteEngine On
    RewriteCond %{HTTP:Upgrade} websocket [NC]
    RewriteRule ^/?(.*) "ws://127.0.0.1:3000/$1" [P,L]
</VirtualHost>
```

4. **Apache Yeniden Başlat:**
   
   CWP Panel → `Service Management` → `Apache` → `Restart`
   
   VEYA SSH ile:
   ```bash
   systemctl restart httpd
   ```

### Adım 3: Uygulamayı Sunucuya Yükle

#### Seçenek A: CWP File Manager (Kolay)

1. CWP Panel → `File Manager`
2. `public_html` klasörüne git
3. `Upload` butonu ile dosyaları yükle
   - `dist/` klasörünün içeriğini yükle
   - `package.json` ve `package-lock.json` yükle

#### Seçenek B: SSH/SCP (Hızlı)

```bash
# Yerel bilgisayarında - build al
npm run build

# SCP ile dosyaları gönder
scp -P 77 -r dist/ sanliur@176.9.138.254:/home/sanliur/public_html/
scp -P 77 package*.json sanliur@176.9.138.254:/home/sanliur/public_html/
```

#### Seçenek C: Git Clone (Eğer Git kuruluysa)

```bash
# SSH ile sunucuya bağlan
cd /home/sanliur/public_html
git clone https://github.com/kullanici/sanliurfa.git .
```

### Adım 4: Node.js Bağımlılıkları ve Build

```bash
# SSH ile sunucuya bağlan
cd /home/sanliur/public_html

# Node modülleri kur
npm ci --legacy-peer-deps --production

# Eğer build alman gerekirse (localde değil sunucuda):
# npm run build

# Astro Node.js standalone entry point kontrolü
ls -la dist/server/entry.mjs
```

### Adım 5: Process Manager ile Çalıştırma

#### Seçenek A: PM2 (Önerilen)

```bash
# PM2 kur (global)
npm install -g pm2

# PM2 ile başlat
pm2 start dist/server/entry.mjs --name "sanliurfa" -- --port 3000

# PM2 startup ayarı (sunucu yeniden başlayınca otomatik)
pm2 startup
pm2 save

# Kontrol
pm2 list
pm2 logs sanliurfa
```

#### Seçenek B: screen/tmux (Basit)

```bash
# screen kurulu değilse
yum install screen -y

# Yeni screen oluştur
screen -S sanliurfa

# Uygulamayı başlat
cd /home/sanliur/public_html
node dist/server/entry.mjs --port 3000

# Detach: Ctrl+A, ardından D
# Yeniden bağlan: screen -r sanliurfa
```

### Adım 6: SSL (HTTPS) Kurulumu

1. CWP Panel → `Webserver Settings` → `SSL Certificates` → `AutoSSL`
2. Kullanıcı: `sanliur`
3. Domain: `sanliurfa.com`
4. `Install SSL` butonu

VEYA Let's Encrypt:

```bash
# SSH ile root olarak
certbot --apache -d sanliurfa.com -d www.sanliurfa.com
```

### Adım 7: Firewall Ayarları

```bash
# Node.js portunu aç (gerekirse)
firewall-cmd --permanent --add-port=3000/tcp
firewall-cmd --reload

# Sadece localhost'tan erişime izin ver (daha güvenli)
# Apache reverse proxy zaten bunu halleder
```

---

## ⚠️ Shared Hosting Özel Notlar

### Root Erişim Yoksa:

Eğer sadece kullanıcı (sanliur) erişimin varsa ve Node.js kurulu değilse:

1. **Hosting sağlayıcısına ticket aç:**
   - "Node.js 22 LTS kurulumu istiyorum"
   - "Apache mod_proxy modüllerinin aktif olması gerekli"

2. **Alternatif: NPX ile çalıştırma:**
   ```bash
   # npx kullanarak node çalıştır (kurulu değilse)
   npx node dist/server/entry.mjs --port 3000
   ```

3. **Statik Export (Eğer SSR çalışmazsa):**
   - Astro yapılandırmasını değiştir:
   ```javascript
   // astro.config.mjs
   export default defineConfig({
     output: 'static',  // SSR yerine static
     // ...
   });
   ```
   - `npm run build` → `dist/` klasöründeki tüm dosyaları FTP ile public_html'e at

---

## 🔧 Troubleshooting

### 1. "Proxy Error" / "502 Bad Gateway"

```bash
# Node.js uygulaması çalışıyor mu kontrol et
curl http://127.0.0.1:3000

# Apache logları
tail -f /var/log/httpd/error_log
tail -f /var/log/httpd/domains/sanliurfa.com.error.log
```

### 2. "Permission Denied"

```bash
# Dosya izinlerini düzelt
chmod 755 /home/sanliur/public_html/dist/server/entry.mjs
chown -R sanliur:sanliur /home/sanliur/public_html/
```

### 3. "Port Already in Use"

```bash
# Portu kullanan process'i bul
netstat -tlnp | grep 3000
# veya
lsof -i :3000

# Process'i öldür
kill -9 <PID>
```

### 4. PM2 Permission Hatası

```bash
# PM2 home dizini ayarla
export PM2_HOME=/home/sanliur/.pm2
pm2 start dist/server/entry.mjs --name "sanliurfa"
```

---

## 📁 Önerilen Dizin Yapısı

```
/home/sanliur/
├── public_html/              # Ana web dizini
│   ├── dist/                 # Astro build çıktısı
│   │   ├── client/           # Statik dosyalar
│   │   └── server/           # SSR entry point
│   │       └── entry.mjs     # Ana dosya
│   ├── package.json          # Dependencies
│   ├── package-lock.json     # Lock file
│   ├── .env                  # Çevre değişkenleri
│   └── node_modules/         # Node modülleri
│
└── logs/                     # Log dosyaları (manuel oluştur)
    ├── app.log
    └── error.log
```

---

## 🚀 Hızlı Başlangıç Komutları

```bash
# 1. SSH Bağlan
ssh -p 77 sanliur@176.9.138.254

# 2. Dizine git
cd /home/sanliur/public_html

# 3. Node.js kontrol et
node -v

# 4. Bağımlılıkları kur
npm ci --legacy-peer-deps --production

# 5. Çevre değişkenleri
export NODE_ENV=production
export PORT=3000

# 6. Başlat
node dist/server/entry.mjs --port 3000

# 7. Arka planda çalıştır (screen ile)
Ctrl+C  # Önce durdur
screen -S sanliurfa
node dist/server/entry.mjs --port 3000
Ctrl+A, D  # Detach
```

---

## 📞 Destek

Sorun yaşarsan:
1. Apache error log: `/var/log/httpd/error_log`
2. Domain log: `/var/log/httpd/domains/sanliurfa.com.error.log`
3. CWP Forum: https://forum.centos-webpanel.com/

**Sunucu Bilgileri:**
- IP: 176.9.138.254
- SSH Port: 77
- Kullanıcı: sanliur
- Panel: CWP (CentOS Web Panel)
- Web Server: Apache
