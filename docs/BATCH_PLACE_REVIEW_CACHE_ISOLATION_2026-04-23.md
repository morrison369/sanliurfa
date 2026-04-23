# Batch Place/Review Cache Isolation - 2026-04-23

Bu batch, mekan/yorum/rozet/promosyon akışlarında hardcoded `sanliurfa:` cache key kullanımını kaldırır.

## Yapılanlar

1. Review oluşturma ve review vote endpointlerinde cache invalidation keyleri normalize edildi.
2. Mekan puan dağılımı endpointinde cache key normalize edildi, `JSON.stringify/JSON.parse` çevrimi kaldırıldı.
3. Mekan rozet endpointinde cache key normalize edildi, cache miss sonrası write eklendi.
4. Promosyon oluşturma endpointinde cache key normalize edildi.
5. `place-verification`, `place-followers`, `photos` kütüphanelerinde:
   - cache keyler prefix-agnostic hale getirildi,
   - gereksiz `JSON.stringify/JSON.parse` cache çevrimleri kaldırıldı.

## Güncellenen Dosyalar

- `src/pages/api/reviews/post.ts`
- `src/pages/api/reviews/[id]/vote.ts`
- `src/pages/api/places/[id]/rating-distribution.ts`
- `src/pages/api/places/[id]/badges.ts`
- `src/pages/api/promotions/create.ts`
- `src/lib/place-verification.ts`
- `src/lib/place-followers.ts`
- `src/lib/photos.ts`

## Doğrulama

- `npm run typecheck:mem` ✅
- `npm run build` ✅
- `npm run security:public-readiness` ✅

