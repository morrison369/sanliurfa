# Güvenlik Rehberi

## 🛡️ Production Güvenlik Kontrol Listesi

### SSL/TLS
- [x] Let's Encrypt SSL sertifikası
- [x] TLS 1.2+ only
- [x] HTTP/2 desteği
- [x] SSL session caching
- [x] OCSP stapling

### HTTP Headers
- [x] X-Frame-Options: SAMEORIGIN
- [x] X-Content-Type-Options: nosniff
- [x] X-XSS-Protection
- [x] Referrer-Policy
- [x] Content-Security-Policy
- [x] Permissions-Policy

### Rate Limiting
- [x] API rate limiting (100 req/dk)
- [x] Auth rate limiting (5 req/dk)
- [x] Nginx rate limiting

### Input Validation
- [x] SQL Injection koruması (Supabase RLS)
- [x] XSS koruması (Astro escape)
- [x] CSRF tokenları
- [x] Form validasyonu

### Authentication
- [x] JWT token'ları (HttpOnly cookie)
- [x] Session timeout
- [x] Secure password hashing
- [x] 2FA desteği (opsiyonel)

## 🔐 Environment Variables

```bash
# Required
JWT_SECRET=<random-256-bit-key>
ENCRYPTION_KEY=<32-char-key>
SUPABASE_SERVICE_ROLE_KEY=<secure-key>

# Optional Security Features
ENABLE_2FA=false
ENABLE_RECAPTCHA=true
RECAPTCHA_SITE_KEY=<key>
RECAPTCHA_SECRET_KEY=<key>
```

## 🚨 Güvenlik İpuçları

1. **Düzenli güncellemeler**: `npm audit fix` her hafta
2. **Backup**: Günlük otomatik yedekleme
3. **Monitoring**: Anormal aktivite takibi
4. **Loglama**: Tüm isteklerin loglanması
5. **Firewall**: Sadece gerekli portlar açık

## 📋 Güvenlik Testleri

```bash
# SSL Test
nmap --script ssl-enum-ciphers -p 443 sanliurfa.com

# Security Headers Test
curl -I https://sanliurfa.com

# Rate Limiting Test
for i in {1..150}; do curl -s -o /dev/null -w "%{http_code}\n" https://sanliurfa.com/api/places; done
```

## 🆘 Güvenlik İhlali Durumunda

1. Sunucuyu hemen yalıt
2. Logları incele
3. Şifreleri resetle
4. SSL sertifikasını yenile
5. Kullanıcıları bilgilendir
6. Olay raporu oluştur
