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

## GitHub Team / Governance

Bu repo için hedef GitHub güvenlik modeli:

- Pull request review zorunlu.
- CODEOWNERS ile kritik alanlarda owner review zorunlu.
- `master` dalına force-push ve deletion yasak.
- Required checks: `Public City Acceptance`, `Security Audit / security`.
- Merge stratejisi: squash-only.
- Production environment secret'ları sadece protected branch üzerinde çalışan job'lara açılır.
- `.env`, `.env.production`, `deploy_key` ve gerçek secret dosyaları git'e eklenmez.

Uygulanmış ayarlar:

- Merge commit kapalı, rebase merge kapalı, squash merge açık.
- Merge sonrası branch silme açık.
- GitHub vulnerability alerts açık.
- Dependabot automated security fixes açık.
- `production` environment protected branch policy ile bağlı.

Plan/ürün sınırı:

- 2026-04-21 tarihinde GitHub API branch protection/ruleset için hala `Upgrade to GitHub Pro or make this repository public` yanıtı döndürdü.
- Advanced Security / secret scanning push protection için API `Advanced security has not been purchased` yanıtı döndürdü.
- Team planı organizasyona alındıysa bu repo ilgili organizasyon altına taşınmalı veya plan bu repo owner'ına uygulanmalıdır.
- Repo public yapılmayacak; önce `npm run security:public-readiness` temiz olmalı ve geçmişteki credential izleri rotate/temizlenmelidir.

Hazır komutlar:

```powershell
.\scripts\github\setup-repository-governance.ps1 -Owner morrison369 -Repo sanliurfa -Branch master
.\scripts\github\set-branch-protection.ps1 -Owner morrison369 -Repo sanliurfa -Branch master
.\scripts\github\set-repository-ruleset.ps1 -Owner morrison369 -Repo sanliurfa
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
