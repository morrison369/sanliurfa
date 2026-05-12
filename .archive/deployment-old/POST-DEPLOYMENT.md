# 🎉 PostgreSQL Migration - Deployment Complete!

## ✅ Tamamlanan İşlemler

### 1. PostgreSQL Migration
- [x] Tüm Supabase referansları PostgreSQL'e çevrildi
- [x] 37 API route güncellendi
- [x] 25+ Astro sayfası güncellendi
- [x] JWT authentication sistemi kuruldu
- [x] Middleware güncellendi

### 2. Deployment
- [x] Node.js 22.12.0 kurulumu tamam
- [x] Build başarıyla tamamlandı
- [x] PM2 process başlatıldı
- [x] .env.production güncellendi
- [x] Post-deployment script hazır

## 🔧 Sunucuda Yapılması Gerekenler

### 1. Database Şema Güncelleme
```bash
ssh sanliur@168.119.79.238 -p 77
bash /home/sanliur/post_deploy_setup.sh
```

Bu script şunları yapar:
- Analytics tablolarını oluşturur
- Badge ve level sistemini kurar
- Admin kullanıcısını kontrol eder
- Uygulamayı yeniden başlatır

### 2. Apache Proxy Yapılandırması (CWP)
CWP Panel'e giriş: https://168.119.79.238:2083

**Seçenek A: CWP Panel Üzerinden**
```
Webserver Settings → Webserver Domain Conf
- Domain: sanliurfa.com
- Proxy: 127.0.0.1:6000
```

**Seçenek B: Manuel Vhost Düzenleme**
```bash
sudo nano /etc/apache2/conf.d/vhosts/sanliurfa.com.conf
```

Proxy ayarları:
```apache
ProxyPreserveHost On
ProxyPass / http://127.0.0.1:6000/
ProxyPassReverse / http://127.0.0.1:6000/
```

### 3. SSL Sertifikası (Cloudflare/CWP)
- Cloudflare SSL modu: **Full (strict)**
- CWP'de SSL sertifikası yüklü

## 🔐 Güvenlik Uyarıları

### Admin Şifresi Değiştirme
**ÖNCELİKLİ:** İlk girişte admin şifresini değiştirin!

```
Varsayılan: admin@sanliurfa.com / admin123
```

Şifre değiştirme adımları:
1. https://sanliurfa.com/giris ile giriş yap
2. /profil/ayarlar sayfasına git
3. Şifre değiştir

### .env.production Güncelleme
Aşağıdaki değerleri gerçek değerlerle değiştirin:

```env
# JWT Secret (üret: openssl rand -base64 32)
JWT_SECRET=your-super-secret-jwt-key-change-this

# Email (Resend API)
RESEND_API_KEY=re_your_api_key_here

# OAuth (opsiyonel)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-app-secret

# Analytics
GA_TRACKING_ID=G-XXXXXXXXXX
```

## 📊 Komutlar

### Uygulama Yönetimi
```bash
ssh sanliur@168.119.79.238 -p 77
source ~/.nvm/nvm.sh

pm2 list                 # Durum
pm2 logs sanliurfa       # Logları gör
pm2 restart sanliurfa    # Yeniden başlat
pm2 stop sanliurfa       # Durdur
```

### Database
```bash
# PostgreSQL'e bağlan
psql -U sanliur_sanliurfa -d sanliur_sanliurfa

# Tabloları listele
\dt

# Admin kullanıcısı kontrol
SELECT email, role FROM users WHERE role = 'admin';
```

### Test
```bash
# Uygulama testi
curl http://127.0.0.1:6000/api/health

# Site testi
curl https://sanliurfa.com/
```

## 🔍 Özellikler

### Çalışan Özellikler
- ✅ Kullanıcı kayıt/giriş (JWT)
- ✅ Mekan listeleme/detay
- ✅ Blog yazıları
- ✅ Tarihi yerler
- ✅ Etkinlikler
- ✅ Gastronomi rehberi
- ✅ Admin panel
- ✅ Favoriler
- ✅ Yorum sistemi

### Eksik/Gelecek Özellikler
- ⏳ Email gönderimi (Resend API key gerekli)
- ⏳ Sosyal medya girişi (OAuth API keys)
- ⏳ Bildirim sistemi (polling tabanlı)
- ⏳ Real-time yorumlar (WebSocket yok)

## 🚨 Sorun Giderme

### 502 Bad Gateway
```bash
# Node.js çalışıyor mu?
source ~/.nvm/nvm.sh && pm2 status

# Port dinleniyor mu?
netstat -tlnp | grep 6000

# Logları kontrol et
pm2 logs sanliurfa --lines 50
```

### Database Hatası
```bash
# Bağlantı testi
psql -U sanliur_sanliurfa -h localhost -c "SELECT 1"

# PostgreSQL servisi
sudo systemctl status postgresql
```

### Build Hatası
```bash
cd /home/sanliur/public_html
source ~/.nvm/nvm.sh
rm -rf node_modules dist
npm install
npm run build
pm2 restart sanliurfa
```

## 📞 Destek
- Sunucu: 168.119.79.238:77
- CWP Panel: https://168.119.79.238:2083
- Proje dizini: `/home/sanliur/public_html`
- Loglar: `~/.pm2/logs/`

---
**Migration Tarihi:** 2026-04-05  
**Node.js:** 22.12.0  
**Database:** PostgreSQL 16  
**Framework:** Astro 6.x
