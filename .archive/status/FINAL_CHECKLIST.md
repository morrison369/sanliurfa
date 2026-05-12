# 🚀 Production'a Geçiş Kontrol Listesi

## Pre-Deployment

### ☑️ Kod ve Build
- [x] Tüm testler geçiyor (`npm test`)
- [x] Build başarılı (`npm run build`)
- [x] Lighthouse skorları iyi (>90)
- [x] Bundle size < 500KB
- [x] Console hataları yok

### ☑️ Veritabanı
- [x] Migrasyonlar çalıştırıldı
- [x] Seed data yüklendi
- [x] RLS policies aktif
- [x] Index'ler oluşturuldu

### ☑️ Environment
- [x] `.env` dosyası oluşturuldu
- [x] Tüm değişkenler dolduruldu
- [x] JWT secret güçlü (256-bit)
- [x] API anahtarları gizli

### ☑️ SSL ve Domain
- [x] Domain DNS ayarları yapıldı
- [x] SSL sertifikası alındı
- [x] HTTPS yönlendirmesi aktif
- [x] WWW → non-www redirect

## Deployment

### ☑️ Sunucu Kurulumu
```bash
# 1. Sunucu hazırlama
./scripts/setup.sh

# 2. Kod deploy
./scripts/deploy.sh

# 3. SSL kurulum
sudo certbot --nginx -d sanliurfa.com

# 4. Nginx restart
sudo systemctl restart nginx
```

### ☑️ Post-Deployment Testleri
- [x] Ana sayfa yükleniyor
- [x] API yanıt veriyor
- [x] Health check OK
- [x] Database bağlantısı var
- [x] Cache çalışıyor

## Monitoring

### ☑️ Alarm Kurulumu
- [x] Uptime monitoring (UptimeRobot/Pingdom)
- [x] Error tracking (Sentry)
- [x] Performance monitoring
- [x] SSL expiry alerts

### ☑️ Backup Stratejisi
- [x] Günlük DB backup (cron: 0 2 * * *)
- [x] Haftalık tam backup
- [x] Backup test edildi
- [x] Offsite backup (S3)

## Son Kontroller

### ☑️ SEO
- [x] Sitemap.xml erişilebilir
- [x] Robots.txt var
- [x] Meta tag'ler doğru
- [x] Social media preview çalışıyor

### ☑️ Performans
- [x] LCP < 2.5s
- [x] FID < 100ms
- [x] CLS < 0.1
- [x] CDN yapılandırması

### ☑️ Güvenlik
- [x] Security headers kontrol edildi
- [x] Rate limiting aktif
- [x] Firewall kuralları
- [x] DDoS protection

## 🎉 GO LIVE!

```bash
# Son health check
curl https://sanliurfa.com/api/health

# PM2 monit ile izleme
pm2 monit

# Log takibi
pm2 logs sanliurfa
```

**Tebrikler! Şanlıurfa.com yayında!** 🚀
