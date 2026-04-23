# Batch User API Cache Isolation - 2026-04-23

Bu batch, kullanıcı odaklı API endpointlerinde hardcoded `sanliurfa:` cache prefix kullanımını temizler ve cache okuma/yazma biçimini tutarlı hale getirir.

## Yapılanlar

1. Kullanıcı profil/search/trending/suggestions endpointlerinde cache key adları normalize edildi.
2. 2FA setup/verify endpointleri yeni prefix-agnostic key standardına geçirildi.
3. Mentions endpointinde cache anahtarı normalize edildi.
4. `trending`, `suggestions` ve `mentions` endpointlerinde gereksiz `JSON.stringify/JSON.parse` çevrimi kaldırıldı; cache katmanına doğrudan obje yazılıp okundu.

## Güncellenen Dosyalar

- `src/pages/api/users/[id].ts`
- `src/pages/api/users/email-preferences.ts`
- `src/pages/api/users/search.ts`
- `src/pages/api/users/trending.ts`
- `src/pages/api/users/suggestions.ts`
- `src/pages/api/users/2fa/setup.ts`
- `src/pages/api/users/2fa/verify.ts`
- `src/pages/api/users/[id]/mentions.ts`

## Doğrulama

- `npm run typecheck:mem` ✅
- `npm run build` ✅
- `npm run security:public-readiness` ✅

