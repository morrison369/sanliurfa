# Batch Social Cache Isolation - 2026-04-23

Bu batch, sosyal akış ve takipçi modüllerinde cache key adlarını hardcoded `sanliurfa:` ön ekinden arındırır.

## Yapılanlar

1. `followers`, `following`, `mutual-friends` cache keyleri normalize edildi.
2. Aktivite akışı (`activity-feed`, `feed`) keyleri prefix-agnostic hale getirildi.
3. İlgili API endpoint keyleri (`/api/followers/stats`, `/api/feed/activity`) aynı standarda çekildi.

## Güncellenen Dosyalar

- `src/lib/followers.ts`
- `src/lib/activity-feed.ts`
- `src/lib/feed.ts`
- `src/pages/api/followers/stats.ts`
- `src/pages/api/feed/activity.ts`

## Doğrulama

- `npm run typecheck:mem` ✅
- `npm run build` ✅
- `npm run security:public-readiness` ✅

