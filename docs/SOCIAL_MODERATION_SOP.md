# Sosyal Moderasyon SOP (Şanlıurfa.com)

Tarih: 2026-04-23

## Amaç

Sosyal eşleşme ve mesajlaşma yüzeyinde moderasyon kararlarını standartlaştırmak ve denetlenebilir yapmak.

## Kapsam

- Eşleşme yönetimi (`/admin/sosyal`)
- Kullanıcı unmatch akışı
- Admin tarafından eşleşme pasifleştirme
- Mesajlaşma flood/spam tekrarları

## Operasyon Kuralları

1. Admin pasifleştirme işleminde gerekçe en az 10 karakter olmalıdır.
2. Aynı kullanıcı için tekrarlı kötüye kullanım varsa önce eşleşme pasifleştirilir, tekrarında hesap moderasyonuna eskale edilir.
3. Kullanıcı unmatch işlemi cezalandırma değildir; kullanıcı tercihidir ve audit log’a yazılır.
4. Eşleşme pasifleştirme kararı geri alınacaksa yalnızca admin panel/endpoint üzerinden kontrollü yapılır.

## Teknik Akış

1. Kullanıcı `POST /api/social/swipe/unmatch` ile eşleşmeyi kapatır.
2. Sistem `social_matches.is_active = false` yapar.
3. İşlem `social_match_moderation_logs` tablosuna `unmatch_by_user` olarak yazılır.
4. Admin `POST /api/admin/social/matches/{id}/deactivate` çağrısıyla pasifleştirme yapar.
5. İşlem `social_match_moderation_logs` tablosuna `deactivate_by_admin` olarak yazılır.

## İnceleme Checklist

1. `actor_user_id` dolu mu?
2. `reason` alanı uygun mu?
3. İşlem zamanı (`created_at`) tutarlı mı?
4. Aynı eşleşme üzerinde anormal işlem sıklığı var mı?

## Eskalasyon

1. 24 saat içinde aynı kullanıcı için 3+ moderasyon kaydı varsa moderasyon ekibine otomatik bildirim önerilir.
2. Mesaj spam guard tetiklenmeleri yoğunlaşırsa kullanıcı bazlı ek throttle uygulanır.
