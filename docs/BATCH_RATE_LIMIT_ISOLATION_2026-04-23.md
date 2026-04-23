# Batch Rate Limit Isolation - 2026-04-23

Bu batch, rate-limit anahtar üretimini daha dayanıklı hale getirir ve Redis key isimlendirmesini proje prefix katmanına tam uyumlu yapar.

## Yapılanlar

1. `src/lib/request-client-id.ts` eklendi.
2. `x-forwarded-for`, `x-real-ip`, `cf-connecting-ip`, `true-client-ip` üzerinden istemci kimliği çıkarımı tek noktaya toplandı.
3. IP alınamadığında `unknown` yerine deterministik `anon:<fingerprint>` fallback kimliği üretildi.
4. `src/lib/api-rate-limit.ts` ve `src/middleware.ts` yeni ortak istemci kimliği yardımcı modülünü kullanacak şekilde güncellendi.
5. `src/lib/advanced-rate-limit.ts` ve `src/lib/rate-limiting.ts` içindeki hardcoded `sanliurfa:` rate-limit prefixleri kaldırıldı.

## Güncellenen Dosyalar

- `src/lib/request-client-id.ts`
- `src/lib/api-rate-limit.ts`
- `src/middleware.ts`
- `src/lib/advanced-rate-limit.ts`
- `src/lib/rate-limiting.ts`

## Doğrulama

- `npm run typecheck:mem` ✅
- `npm run build` ✅
- `npm run security:public-readiness` ✅

