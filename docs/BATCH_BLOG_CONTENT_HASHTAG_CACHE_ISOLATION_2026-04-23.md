# Batch Blog/Content/Hashtag Cache Isolation - 2026-04-23

Bu batch, blog, içerik yönetimi ve hashtag endpointlerinde hardcoded `sanliurfa:` cache key kullanımını kaldırır.

## Yapılanlar

1. `src/lib/blog.ts` içinde blog cache keyleri normalize edildi (`blog:*`).
2. `src/lib/content-management.ts` içinde içerik cache keyleri normalize edildi (`content:*`).
3. İçerik wildcard temizliği için hatalı `deleteCache('...*')` kullanımları `deleteCachePattern('...*')` olarak düzeltildi.
4. Blog/hashtag/content API endpointlerinde cache keyler normalize edildi.
5. Hashtag ve içerik tarafında gereksiz `JSON.stringify/JSON.parse` cache çevrimi kaldırıldı.

## Güncellenen Dosyalar

- `src/lib/blog.ts`
- `src/lib/content-management.ts`
- `src/pages/api/blog/subscribe.ts`
- `src/pages/api/blog/scheduled-posts.ts`
- `src/pages/api/content/[contentId].ts`
- `src/pages/api/hashtags/index.ts`
- `src/pages/api/hashtags/[slug].ts`

## Doğrulama

- `npm run typecheck:mem` ✅
- `npm run build` ✅
- `npm run security:public-readiness` ✅

