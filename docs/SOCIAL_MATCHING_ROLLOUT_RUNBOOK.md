# Sosyal Eşleşme Rollout Runbook

Tarih: 2026-04-23

## Hedef

Sosyal eşleşme modülünü güvenli şekilde açıp kapatabilmek, problemde hızlı geri alma yapabilmek.

## Feature Flag

- `SOCIAL_MATCHING_ENABLED=true|false`
- Flag `false` olduğunda:
  - `/sosyal/eslesme` bakım mesajı gösterir
  - `/api/social/swipe/*` uçları `503` döner

## Staging Adımları

1. `.env` içinde `SOCIAL_MATCHING_ENABLED=true` doğrula.
2. `npm run migrate` çalıştır (`132_social_match_moderation_logs` dahil).
3. Smoke:
   - swipe profile get/put
   - candidate list
   - like/pass
   - unmatch
   - admin deactivate
4. `/admin/sosyal` istatistik ve log ekranını kontrol et.

## Prod Açılış Adımları

1. Migration kontrolü: `migrations` tablosunda `131` ve `132` var mı?
2. Flag başlangıçta `false` bırak.
3. Deploy sonrası health ve critical API smoke geç.
4. Flag’i `true` aç.
5. İlk 60 dakika metrik izle:
   - 429 oranı
   - 5xx oranı
   - unmatch/deactivate anomali oranı

## Geri Alma

1. `SOCIAL_MATCHING_ENABLED=false` yap.
2. Uygulamayı yeniden başlat.
3. `/sosyal/eslesme` bakım mesajı ve API `503` davranışını doğrula.
