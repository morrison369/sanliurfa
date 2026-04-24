# OpenAPI Coverage Plan

Bu plan, `docs/openapi-route-gap-baseline.json` dosyasindaki mevcut gap'i (dokumante edilmemis route'lar) kontrollu sekilde azaltmak icindir.

## Hedef
- Baseline gap: `375`
- Kisa vade hedefi: her sprintte `20-30` endpoint dokumantasyonu
- Gate kurali: baseline disinda yeni undocumented route kabul edilmez

## Durum (2026-04-18)
- P1 endpoint seti OpenAPI dokumanina eklendi (`src/pages/api/docs/openapi.json.ts`).
- Kalan gap, baseline regressionsiz sekilde takip edilir.

## Sprint Sirasi
1. `places` + `search` + `user` domainleri
2. `auth` + `favorites` + `notifications`
3. `admin` (dashboard, users, moderation)
4. `blog` + `events` + `webhooks`
5. `analytics` + `reports` + `realtime`

## Ilk 20 Oncelikli Endpoint (P1)
1. `/places`
2. `/places/{id}/analytics`
3. `/places/{id}/badges`
4. `/places/{id}/review-analytics`
5. `/search/advanced`
6. `/search/recommendations`
7. `/users/profile`
8. `/users/preferences`
9. `/users/email-preferences`
10. `/users/{id}/profile`
11. `/auth/login`
12. `/auth/register`
13. `/auth/login/verify-2fa`
14. `/favorites`
15. `/favorites/bulk`
16. `/notifications`
17. `/notifications/unsubscribe`
18. `/blog/posts`
19. `/blog/posts/{slug}`
20. `/events/{id}/details`

## Operasyon Komutlari
```bash
# Gap domain ozetini gor
npm run openapi:gap:summary

# Route gap regression gate
npm run openapi:sync:routes:gate

# Bilincli baseline guncellemesi
npm run openapi:sync:routes:baseline
```

## Kabul Kriterleri
- Yeni/degisen API route, ayni PR'da OpenAPI'ye eklenmis olmali.
- Kritik endpoint'lerde response schema `#/components/schemas/*` ref ile tanimlanmis olmali.
- `npm run api:release:gate` gecmeli.
- `npm run openapi:sync:routes:gate` regressionsiz gecmeli.
