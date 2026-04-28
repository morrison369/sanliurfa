# Şanlıurfa.com - CWP Shared Hosting Deploy Rehberi
> **NOT:** Bu rehber CWP kullanıcı hesabı (root olmayan) ile çalışmak üzere hazırlanmıştır.

---

## 1. CWP Panel Hazırlığı

### 1.1 Domain Ekleme
1. CWP Admin → **WebServer Settings** → **New Account**
2. Domain: `sanliurfa.com`
3. Paket: Varsayılan
4. **Create**

### 1.2 Node.js Kurulumu
1. CWP User Panel → **Software** → **Node.js Selector**
2. **Node.js 22** seçin ve **Enable** tıklayın
3. Uygulama yolu: `/home/sanliurfa/public_html`
4. Port: `4321`

### 1.3 PostgreSQL Veritabanı
1. CWP User Panel → **SQL Services** → **PostgreSQL Databases**
2. **Create Database**
   - Database: `sanliurfa_db`
   - User: `sanliurfa_db_user`
   - Password: Güçlü şifre oluşturun
3. **Not edin:** `DB_USER`, `DB_PASSWORD`, `DB_NAME`

### 1.4 E-posta Hesabı
1. CWP User Panel → **Mail Manager** → **Add Mail Account**
2. E-posta: `noreply@sanliurfa.com`
3. Şifre: Güçlü şifre oluşturun

---

## 2. Sunucu Kurulumu (SSH)

### 2.1 Bağlanma
```bash
ssh sanliurfa@sanliurfa.com
```

### 2.2 Dizin Hazırlığı
```bash
cd /home/sanliurfa/public_html
```

### 2.3 Projeyi Yükleme
```bash
# Git ile
git clone https://github.com/kullanici/sanliurfa.com.git .

# veya SCP ile
# scp -r sanliurfa/* sanliurfa@sanliurfa.com:/home/sanliurfa/public_html/
```

### 2.4 .env Dosyası
```bash
cp .env.production .env
nano .env
```

Aşağıdaki değerleri CWP Panel'den aldığınız bilgilerle doldurun:
```env
DATABASE_URL=postgresql://sanliurfa_db_user:SIFRENIZ@localhost:5432/sanliurfa_db
DB_USER=sanliurfa_db_user
DB_PASSWORD=SIFRENIZ
DB_NAME=sanliurfa_db
JWT_SECRET=$(openssl rand -base64 48)
SESSION_SECRET=$(openssl rand -base64 48)
SMTP_USER=noreply@sanliurfa.com
SMTP_PASS=EPOSTA_SIFRENIZ
```

### 2.5 Bağımlılıklar ve Build
```bash
npm install --legacy-peer-deps --production
npm run build
```

### 2.6 PM2 Başlatma
```bash
# PM2 global kurulum (CWP user olarak)
npm install -g pm2

# Başlatma
bash scripts/pm2-cwp-start.sh
```

---

## 3. Apache Yapılandırması

`.htaccess` dosyası zaten proje kök dizininde mevcut. CWP bunu otomatik okur.

Apache'nin şu modüllerinin aktif olduğundan emin olun (CWP genelde hepsini kurar):
- `mod_proxy`
- `mod_proxy_http`
- `mod_rewrite`
- `mod_headers`
- `mod_deflate`
- `mod_expires`

---

## 4. Veritabanı Seed

```bash
# Seed script'i çalıştır
npx tsx scripts/seed-content.ts
```

---

## 5. Deployment (Güncelleme)

Her kod güncellemesinde:
```bash
cd /home/sanliurfa/public_html
bash scripts/deploy-shared.sh
```

Bu script otomatik olarak:
1. Yedek alır
2. Kodu günceller
3. Build oluşturur
4. PM2'yi yeniden başlatır
5. Sağlık kontrolü yapar

---

## 6. Sorun Giderme

### PM2 Başlamıyor
```bash
# Logları kontrol et
pm2 logs sanliurfa-app --lines 50

# Manuel başlat
cd /home/sanliurfa/public_html
pm2 start ecosystem.config.cjs --name sanliurfa-app
```

### Port Çakışması
```bash
# Port 4321'i kullanan process
netstat -tulpn | grep 4321

# Alternatif port
PORT=6001 node dist/server/entry.mjs
```

### Veritabanı Bağlantı Hatası
```bash
# Bağlantı testi
psql -h localhost -U sanliurfa_db_user -d sanliurfa_db -c "SELECT 1"
```

### Apache Proxy Hatası
```bash
# Apache hata logu
tail -f /usr/local/apache/logs/error_log

# .htaccess syntax
apachectl configtest
```

---

## 7. Güvenlik

```bash
# .env dosyası izinleri
chmod 600 .env

# Upload dizini
mkdir -p uploads
chmod 755 uploads
```

---

## 8. Otomatik Başlatma (Reboot Sonrası)

```bash
# Crontab'a ekle
crontab -e

# Satır ekle:
@reboot cd /home/sanliurfa/public_html && pm2 resurrect
```

---

## 9. Monitoring

```bash
# PM2 durumu
pm2 status

# Loglar
pm2 logs sanliurfa-app

# Sağlık kontrolü
curl http://127.0.0.1:4321/api/health
```

---

*Bu rehber CWP Shared Hosting için hazırlanmıştır. Root yetkisi gerektirmez.*
