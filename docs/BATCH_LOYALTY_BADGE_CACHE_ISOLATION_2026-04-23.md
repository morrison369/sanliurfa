# Batch Loyalty/Badge Cache Isolation - 2026-04-23

Bu batch, sadakat, başarımlar, rozet ve liderlik tabloları akışlarında hardcoded `sanliurfa:` cache key öneklerini kaldırır.

## Yapılanlar

1. Sadakat çekirdeği (`loyalty-system`, `loyalty-tiers`, `loyalty-points`) cache anahtarları prefix-agnostic hale getirildi.
2. Başarım modülü (`achievements`) ve başarım API'si cache anahtarları normalize edildi.
3. Admin sadakat endpointlerinde (`award`, `rewards`) cache invalidation anahtarları normalize edildi.
4. Rozet tanımları endpointi cache katmanı düzeltildi:
   `getCache` dönüşü doğrudan kullanılıyor, gereksiz `JSON.parse` kaldırıldı ve cache write eklendi.
5. Liderlik tabloları (`users`, `badges`) cache keyleri normalize edildi.

## Güncellenen Dosyalar

- `src/lib/achievements.ts`
- `src/lib/loyalty-system.ts`
- `src/lib/loyalty-tiers.ts`
- `src/lib/loyalty-points.ts`
- `src/pages/api/loyalty/achievements.ts`
- `src/pages/api/admin/loyalty/rewards.ts`
- `src/pages/api/admin/loyalty/award.ts`
- `src/pages/api/badges/definitions.ts`
- `src/pages/api/leaderboards/users.ts`
- `src/pages/api/leaderboards/badges.ts`

## Doğrulama

- `npm run typecheck:mem` ✅
- `npm run build` ✅
- `npm run security:public-readiness` ✅

