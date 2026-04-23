# Batch Cache Isolation - 2026-04-23

Bu batch, Redis key izolasyonunu kod seviyesinde güçlendirir ve Redis hata loglarında `{}` gibi anlamsız çıktıların önüne geçer.

## Yapılanlar

1. Sosyal takip, mesajlaşma ve sosyal özellikler cache keyleri `sanliurfa:` sabitinden arındırıldı.
2. Cache key namespace yönetimi tamamen `src/lib/cache.ts` içindeki `REDIS_KEY_PREFIX` katmanına bırakıldı.
3. `src/lib/cache.ts` içindeki hata mesajı çözümleyici, `JSON.stringify(error) === '{}'` ve `[]` durumlarında anlamlı bir fallback mesaj üretir.

## Güncellenen Dosyalar

- `src/lib/messages.ts`
- `src/lib/following.ts`
- `src/lib/social-features.ts`
- `src/pages/api/messages/[conversationId].ts`
- `src/lib/cache.ts`

## Doğrulama

- `npm run typecheck:mem` ✅
- `npm run build` ✅
- `npm run security:public-readiness` ✅

## Etki

- Proje-özel Redis izolasyonu env tabanlı ve tutarlı hale gelir.
- Çoklu proje/ortak Redis senaryosunda hardcoded prefix kaynaklı çakışma riski azalır.
- Redis geçici erişim problemlerinde observability daha okunur hale gelir.
