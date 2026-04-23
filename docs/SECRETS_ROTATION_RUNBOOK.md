# Secrets Rotation Runbook

Bu runbook production yayın öncesi zorunlu secret rotasyon adımlarını tanımlar.

## Kapsam
- JWT ve session secret
- Database kullanıcı şifresi
- Redis erişim bilgileri
- Stripe / Resend / OAuth sağlayıcıları
- Görsel sağlayıcıları (Pexels / Unsplash)

## Zorunlu Kurallar
- Gerçek key/secret değerleri tracked dosyalara yazılmaz.
- `.env.example` ve `.env.production.template` sadece placeholder içerir.
- Rotation sonrası eski anahtarlar revoke edilir.
- Uygulama sadece environment üzerinden secret okur.

## İş Akışı
1. Yeni secret değerlerini provider panelinden üret.
2. Hosting/CWP ortamında domain kullanıcısı adına env olarak güncelle.
3. Uygulamayı yeniden başlat.
4. Kritik smoke (auth, API, webhook, sosyal) çalıştır.
5. Eski secret değerlerini devre dışı bırak.

## Görsel Sağlayıcılar
Production’da aşağıdaki değişkenler secret store’dan okunmalı:

```env
PEXELS_API_KEY=...
UNSPLASH_ACCESS_KEY=...
UNSPLASH_SECRET_KEY=...
```

## Doğrulama
- `npm run security:secrets-rotation-contract`
- `npm run security:public-readiness`
