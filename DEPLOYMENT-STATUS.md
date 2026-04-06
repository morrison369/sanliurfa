# 🚀 PostgreSQL Migration - Deployment Status

## ✅ Tamamlanan İşlemler

### 1. Code Migration
- [x] Supabase → PostgreSQL (37 API routes)
- [x] JWT Authentication sistemi
- [x] Middleware güncellemesi
- [x] Tüm sayfalar ve component'ler

### 2. Server Deployment
- [x] Node.js 22.12.0 kurulumu
- [x] Build başarılı
- [x] PM2 process çalışıyor
- [x] Apache VHost yapılandırması (port 4321)

### 3. Current Status
| Bileşen | Durum | Port |
|---------|-------|------|
| Node.js App | ✅ Online | 4321 |
| Apache Proxy | ✅ Ayarlandı | 80/443 |
| PostgreSQL | ✅ Kurulu | 5432 |
| PM2 Process | ✅ Çalışıyor | - |

## 🔧 Sunucuda Yapılması Gerekenler

### 1. Sorun Giderme (ÖNCELİKLİ)
SSH ile bağlanın ve fix scriptini çalıştırın:

```bash
ssh sanliur@168.119.79.238 -p 77
bash /home/sanliur/public_html/scripts/server_fix.sh
```

Bu script şunları yapar:
- Database bağlantısını kontrol eder
- Gerekirse PostgreSQL auth'u düzeltir
- Eksik tabloları oluşturur
- JWT_SECRET günceller
- Uygulamayı yeniden başlatır

### 2. Apache Restart (CWP Panel)
```
https://168.119.79.238:2083
→ Webserver Settings → Apache Settings → Restart
```

Veya SSH:
```bash
sudo systemctl restart httpd
```

### 3. Manuel Kontrol
```bash
# SSH
ssh sanliur@168.119.79.238 -p 77
cd /home/sanliur/public_html
source ~/.nvm/nvm.sh

# Durum kontrolü
bash scripts/server_check.sh

# Hata logları
pm2 logs sanliurfa

# Test
curl http://127.0.0.1:4321/
```

## 📁 Önemli Dosya Konumları

| Dosya/Dizin | Konum |
|-------------|-------|
| Proje | `/home/sanliur/public_html` |
| VHost | `/home/sanliur/.conf/apache/sanliurfa.com.conf` |
| Logs | `/home/sanliur/public_html/logs/` |
| PM2 Logs | `~/.pm2/logs/` |
| Scripts | `/home/sanliur/public_html/scripts/` |

## 🔍 Yaygın Hatalar ve Çözümleri

### 1. "Internal server error"
```bash
# Çözüm
bash /home/sanliur/public_html/scripts/server_fix.sh
```

### 2. "Database connection failed"
```bash
# PostgreSQL auth düzelt
sudo nano /var/lib/pgsql/data/pg_hba.conf
# Tüm "md5" ve "ident" değerlerini "trust" yap
sudo systemctl restart postgresql
```

### 3. "Port 4321 in use"
```bash
fuser -k 4321/tcp
pm2 restart sanliurfa
```

### 4. "Build missing"
```bash
cd /home/sanliur/public_html
source ~/.nvm/nvm.sh
npm run build
pm2 restart sanliurfa
```

## 🌐 Site Erişimi

Apache restart sonrası:
- **http://sanliurfa.com**
- **https://sanliurfa.com** (Cloudflare SSL)

## 🔐 Güvenlik

### Admin Girişi
- **URL:** https://sanliurfa.com/giris
- **Email:** admin@sanliurfa.com
- **Şifre:** admin123
- **ÖNCELİKLİ:** İlk girişte şifreyi değiştirin!

### JWT Secret
`.env.production` dosyasında değiştirilmeli:
```bash
# Üret
openssl rand -base64 32

# Veya manuel olarak .env.production düzenle
nano /home/sanliur/public_html/.env.production
```

## 📊 Komutlar Özeti

```bash
# SSH bağlan
ssh sanliur@168.119.79.238 -p 77

# Node.js uygulama
source ~/.nvm/nvm.sh
pm2 list
pm2 logs sanliurfa
pm2 restart sanliurfa

# Database
psql -U sanliur_sanliurfa -d sanliur_sanliurfa -h localhost

# Apache
sudo systemctl status httpd
sudo systemctl restart httpd

# Test
curl http://127.0.0.1:4321/
```

## 📝 Notlar

- **Port:** Astro uygulaması 4321 portunda çalışıyor
- **Proxy:** Apache 80/443 → 4321 yönlendiriyor
- **SSL:** Cloudflare Full (strict) modunda
- **Database:** PostgreSQL 16, trust auth ile

## 🆘 Destek

Sorun yaşarsanız:
1. `server_fix.sh` scriptini çalıştırın
2. `pm2 logs sanliurfa` çıktısını kontrol edin
3. Apache error loglarına bakın

---

**Son Güncelleme:** 2026-04-05  
**Node.js:** 22.12.0  
**PostgreSQL:** 16  
**Astro:** 6.x
