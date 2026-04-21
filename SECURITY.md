# Güvenlik Rehberi\n\n## 🛡️ Production Güvenlik Kontrol Listesi\n\n### SSL/TLS\n- [x] Let's Encrypt SSL sertifikası\n- [x] TLS 1.2+ only\n- [x] HTTP/2 desteği\n- [x] SSL session caching\n- [x] OCSP stapling\n\n### HTTP Headers\n- [x] X-Frame-Options: SAMEORIGIN\n- [x] X-Content-Type-Options: nosniff\n- [x] X-XSS-Protection\n- [x] Referrer-Policy\n- [x] Content-Security-Policy\n- [x] Permissions-Policy\n\n### Rate Limiting\n- [x] API rate limiting (100 req/dk)\n- [x] Auth rate limiting (5 req/dk)\n- [x] Nginx rate limiting\n\n### Input Validation\n- [x] SQL Injection koruması (Supabase RLS)\n- [x] XSS koruması (Astro escape)\n- [x] CSRF tokenları\n- [x] Form validasyonu\n\n### Authentication\n- [x] JWT token'ları (HttpOnly cookie)\n- [x] Session timeout\n- [x] Secure password hashing\n- [x] 2FA desteği (opsiyonel)\n\n## 🔐 Environment Variables
\n```bash\n# Required\nJWT_SECRET=<random-256-bit-key>\nENCRYPTION_KEY=<32-char-key>\nSUPABASE_SERVICE_ROLE_KEY=<secure-key>\n\n# Optional Security Features\nENABLE_2FA=false\nENABLE_RECAPTCHA=true
RECAPTCHA_SITE_KEY=<key>
RECAPTCHA_SECRET_KEY=<key>
```

## GitHub Team / Governance

Bu repo için hedef GitHub güvenlik modeli:

- Pull request review zorunlu.
- CODEOWNERS ile kritik alanlar tanimli.
- `master` dalına force-push ve deletion yasak.
- Required checks GitHub Actions billing/runner kuyrugu cozulene kadar advisory.
- Merge stratejisi: squash-only.
- Production environment secret'ları sadece protected branch üzerinde çalışan job'lara açılır.
- `.env`, `.env.production`, `deploy_key` ve gerçek secret dosyaları git'e eklenmez.

Uygulanmış ayarlar:

- Merge commit kapalı, rebase merge kapalı, squash merge açık.
- Merge sonrası branch silme açık.
- GitHub vulnerability alerts açık.
- Dependabot automated security fixes açık.
- `production` environment protected branch policy ile bağlı.
- Branch protection ve repository ruleset aktif.
- Tek kisilik org nedeniyle review zorunlulugu kapali; ikinci collaborator eklenince 1 approval + CODEOWNER review tekrar acilacak.

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
\n1. **Düzenli güncellemeler**: `npm audit fix` her hafta\n2. **Backup**: Günlük otomatik yedekleme\n3. **Monitoring**: Anormal aktivite takibi\n4. **Loglama**: Tüm isteklerin loglanması\n5. **Firewall**: Sadece gerekli portlar açık\n\n## 📋 Güvenlik Testleri\n\n```bash\n# SSL Test\nnmap --script ssl-enum-ciphers -p 443 sanliurfa.com\n\n# Security Headers Test\ncurl -I https://sanliurfa.com\n\n# Rate Limiting Test\nfor i in {1..150}; do curl -s -o /dev/null -w "%{http_code}\n" https://sanliurfa.com/api/places; done\n```\n\n## 🆘 Güvenlik İhlali Durumunda\n\n1. Sunucuyu hemen yalıt\n2. Logları incele\n3. Şifreleri resetle\n4. SSL sertifikasını yenile\n5. Kullanıcıları bilgilendir\n6. Olay raporu oluştur\n
