# 🚀 DEPLOY CHECKLIST - CWP Shared Hosting

**Proje:** Şanlıurfa.com  
**Platform:** CentOS Web Panel (CWP) Shared Hosting  
**Tarih:** 11 Nisan 2026

---

## ✅ PRE-DEPLOYMENT (Yerel)

### Kod Kontrolü
- [ ] Son commit'ler test edildi
- [ ] Git push yapıldı
- [ ] Branch: `main` (production)

### Build Kontrolü
```bash
# Build test
npm run build

# Build süresi: ~9 saniye
# Build başarılı: dist/ dizini oluştu
```
- [ ] Build hatasız tamamlandı
- [ ] `dist/client/` içinde static dosyalar var
- [ ] `dist/server/entry.mjs` var

### Test Kontrolü
```bash
npm test
```
- [ ] 1445 test geçti
- [ ] 0 kritik hata

### Environment Hazırlığı
```bash
cp .env.example .env.production
```

**Doldurulması gerekenler:**
- [ ] `DATABASE_URL` (CWP PostgreSQL)
- [ ] `REDIS_URL` (varsa)
- [ ] `SUPABASE_URL`
- [ ] `SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `JWT_SECRET` (güçlü şifre)
- [ ] `SENTRY_DSN` (opsiyonel)
- [ ] `METRICS_API_TOKEN` (opsiyonel)

---

## 🖥️ SERVER PREPARATION (CWP)

### SSH Erişim
```bash
ssh kullanici@sunucu-ip
```
- [ ] SSH bağlantısı aktif
- [ ] sudo yetkisi var (gerekirse)

### Node.js Kontrolü
```bash
node --version  # v22.x.x
npm --version   # 10.x.x
```
- [ ] Node.js 22+ kurulu
- [ ] npm çalışıyor

### PM2 Kontrolü
```bash
pm2 --version
```
- [ ] PM2 kurulu
- [ ] PM2 startup ayarlı: `pm2 startup systemd`

### PostgreSQL Kontrolü
```bash
psql --version
sudo systemctl status postgresql-15
```
- [ ] PostgreSQL 15+ çalışıyor
- [ ] Veritabanı oluşturuldu: `sanliurfa`
- [ ] Kullanıcı oluşturuldu: `sanliurfa_user`

### Redis Kontrolü (Opsiyonel)
```bash
redis-cli ping
```
- [ ] Redis çalışıyor (varsa)

---

## 📦 DEPLOYMENT

### 1. Dosya Yükleme
```bash
# Yerelden sunucuya
scp -r dist/ kullanici@sunucu:/home/kullanici/public_html/
scp package.json kullanici@sunucu:/home/kullanici/public_html/
scp ecosystem.config.cjs kullanici@sunucu:/home/kullanici/public_html/
scp .env.production kullanici@sunucu:/home/kullanici/public_html/.env
```

- [ ] Tüm dosyalar yüklendi
- [ ] `.env` dosyası sunucuda

### 2. Bağımlılıklar
```bash
ssh kullanici@sunucu
cd /home/kullanici/public_html
npm ci --omit=dev
```

- [ ] `npm ci` hatasız tamamlandı
- [ ] `node_modules` oluştu

### 3. Migrations
```bash
npm run db:migrate
```

- [ ] Tüm migrations çalıştı
- [ ] Veritabanı tabloları oluştu

### 4. PM2 Başlatma
```bash
pm2 start ecosystem.config.cjs --env production
pm2 save
```

- [ ] PM2 process çalışıyor
- [ ] Loglarda hata yok: `pm2 logs sanliurfa --lines 20`

### 5. Port Kontrolü
```bash
netstat -tulpn | grep 3000
# veya
ss -tulpn | grep 3000
```

- [ ] Port 3000 dinleniyor
- [ ] Node.js process bağlı

---

## 🌐 CWP CONFIGURATION

### Web Server Domain Conf
```
CWP Admin → Web Server Settings → Webserver Domain Conf
```

- [ ] Username seçildi
- [ ] Domain seçildi: `sanliurfa.com`
- [ ] Configuration: **Nginx → Custom Port** ✅
- [ ] Port: `3000`
- [ ] IP: `127.0.0.1`
- [ ] "Rebuild webserver conf" checked
- [ ] Saved

### SSL Sertifikası
```
CWP Admin → Web Server Settings → SSL Certificates → AutoSSL
```

- [ ] Domain seçildi
- [ ] AutoSSL kuruldu
- [ ] HTTPS test edildi: `https://sanliurfa.com`

### Nginx Config Doğrulama
```bash
nginx -t
systemctl reload nginx
```

- [ ] Config test başarılı
- [ ] Nginx reload edildi

---

## 🧪 TESTING

### Temel Erişim Testleri
```bash
# HTTP → HTTPS yönlendirmesi
curl -I http://sanliurfa.com
# 301 Redirect bekleniyor

# HTTPS erişimi
curl -I https://sanliurfa.com
# 200 OK bekleniyor
```

- [ ] HTTP → HTTPS yönlendirmesi çalışıyor
- [ ] HTTPS erişimi aktif

### API Testleri
```bash
# Health check
curl https://sanliurfa.com/api/health

# Örnek API
curl https://sanliurfa.com/api/places
```

- [ ] `/api/health` 200 dönüyor
- [ ] API yanıt veriyor
- [ ] Response JSON formatında

### Statik Dosyalar
```bash
curl -I https://sanliurfa.com/_astro/app.js
# 200 ve cache headers bekleniyor
```

- [ ] JS/CSS dosyaları yükleniyor
- [ ] Cache headers var

### Database Testi
```bash
# PostgreSQL bağlantı testi
psql $DATABASE_URL -c "SELECT COUNT(*) FROM users;"
```

- [ ] DB bağlantısı aktif
- [ ] Tablolara erişim var

---

## 🔒 SECURITY CHECKS

### Headers Kontrolü
```bash
curl -I https://sanliurfa.com
```

Beklenen header'lar:
- [ ] `X-Frame-Options: SAMEORIGIN`
- [ ] `X-Content-Type-Options: nosniff`
- [ ] `X-XSS-Protection: 1; mode=block`
- [ ] `Referrer-Policy: strict-origin-when-cross-origin`

### SSL Test
```bash
# SSL Labs test (tarayıcıdan)
https://www.ssllabs.com/ssltest/analyze.html?d=sanliurfa.com
```

- [ ] SSL Grade: A+ veya A
- [ ] TLS 1.2+ aktif
- [ ] Zayıf şifreler devre dışı

### .env Güvenliği
```bash
# .env dosyası web'den erişilebilir mi?
curl https://sanliurfa.com/.env
# 403 veya 404 bekleniyor
```

- [ ] `.env` dosyası erişilemiyor
- [ ] `.htaccess` düzgün yapılandırılmış

---

## ⚡ PERFORMANCE CHECKS

### Load Time Test
```bash
# curl ile timing
curl -o /dev/null -s -w "\nTime: %{time_total}s\n" https://sanliurfa.com
```

- [ ] Ana sayfa < 3 saniye
- [ ] API yanıtı < 500ms

### Cache Headers
```bash
curl -I https://sanliurfa.com/_astro/app.js
```

- [ ] Static dosyalar cache'leniyor
- [ ] Cache-Control header'ları var

### PM2 Status
```bash
pm2 status
pm2 monit
```

- [ ] CPU kullanımı < 50%
- [ ] Memory kullanımı < 512MB
- [ ] Restart sayısı 0

---

## 📊 MONITORING SETUP

### PM2 Monitoring
```bash
pm2 startup systemd
pm2 save
```

- [ ] PM2 startup ayarlandı
- [ ] PM2 save yapıldı

### Log Rotation
```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 10
```

- [ ] Log rotation aktif
- [ ] Max 10 log dosyası tutuluyor

### Health Check Script
```bash
# /home/kullanici/check-health.sh
#!/bin/bash
if ! pgrep -f "node.*sanliurfa"; then
    cd /home/kullanici/public_html
    pm2 start ecosystem.config.cjs
    echo "$(date): App restarted" >> /home/kullanici/logs/health.log
fi
```

- [ ] Health check script oluşturuldu
- [ ] Cron job eklendi: `*/5 * * * * /home/kullanici/check-health.sh`

---

## 📝 POST-DEPLOYMENT

### DNS Kontrolü
```bash
nslookup sanliurfa.com
dig sanliurfa.com
```

- [ ] DNS doğru IP'yi gösteriyor
- [ ] www redirect çalışıyor

### Google Search Console
- [ ] Site doğrulandı
- [ ] Sitemap submit edildi: `https://sanliurfa.com/sitemap.xml`
- [ ] Robots.txt kontrol edildi

### Analytics
- [ ] Google Analytics aktif
- [ ] Sentry DSN ayarlandı (varsa)

### Backup
```bash
# Manuel backup
mysqldump -u user -p sanliurfa > backup_$(date +%Y%m%d).sql
tar -czf backup_$(date +%Y%m%d).tar.gz /home/kullanici/public_html/dist
```

- [ ] İlk backup alındı
- [ ] Backup otomasyonu kuruldu (opsiyonel)

---

## 🚨 EMERGENCY PROCEDURES

### Uygulama Çökerse
```bash
# Hızlı restart
pm2 restart sanliurfa

# veya
pm2 delete all
pm2 start ecosystem.config.cjs
```

### Nginx Hatası
```bash
# Config test
nginx -t

# Nginx restart
systemctl restart nginx
# veya CWP üzerinden
```

### Database Bağlantı Hatası
```bash
# PostgreSQL status
systemctl status postgresql-15

# PostgreSQL restart
systemctl restart postgresql-15
```

### Rollback (Önceki Sürüme Dönüş)
```bash
cd /home/kullanici/public_html
git log --oneline -5  # Son commitleri gör
git checkout <onceki-commit-hash>
npm ci --omit=dev
npm run build
pm2 restart sanliurfa
```

---

## ✅ FINAL VERIFICATION

### Son Kontroller
- [ ] Site HTTPS üzerinden erişilebilir
- [ ] Tüm sayfalar yükleniyor
- [ ] API'ler çalışıyor
- [ ] Formlar gönderiliyor
- [ ] Login/Logout çalışıyor
- [ ] Admin panel erişilebilir
- [ ] Mobil görünüm uygun

### Dokümantasyon
- [ ] Bu checklist tamamlandı
- [ ] Tüm ekibin erişimi var
- [ ] Acil durum iletişim bilgileri hazır

---

## 🎉 DEPLOYMENT TAMAMLANDI!

**Tarih:** _______________  
**Deploy Eden:** _______________  
**Onay:** _______________

---

## 📞 DESTEK

Sorun olursa:
1. CWP Forum: https://forum.centos-webpanel.com/
2. PM2 Docs: https://pm2.keymetrics.io/
3. Astro Docs: https://docs.astro.build/

**Hayırlı olsun! 🚀**
