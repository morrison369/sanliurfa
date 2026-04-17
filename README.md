# Şanlıurfa.com

Şanlıurfa.com, Astro SSR tabanlı şehir rehberi ve topluluk platformudur. Aktif arayüz çalışma zamanı Astro + düz TypeScript modelindedir; React entegrasyonu ise kontrollü uyumluluk katmanı olarak korunur.

## Önce Bunları Aç

- [AGENTS.md](D:\sanliurfa.com\AGENTS.md)
- [ACTIVE_DOCS.md](D:\sanliurfa.com\sanliurfa-ops-batch-all\docs\ACTIVE_DOCS.md)
- [ARCHITECTURE.md](D:\sanliurfa.com\sanliurfa-ops-batch-all\ARCHITECTURE.md)
- [CLAUDE.md](D:\sanliurfa.com\sanliurfa-ops-batch-all\CLAUDE.md)

## Güncel Kısa Durum

- çatı sistemi: Astro SSR
- adaptör: `@astrojs/node`
- aktif `.tsx` yüzeyi: `0`
- aktif hydration: `0`
- React paketleri: korunuyor, ama aktif arayüz sahibi değil

Detay için:

- [ASTRO_RUNTIME_STATE.md](D:\sanliurfa.com\sanliurfa-ops-batch-all\docs\architecture\ASTRO_RUNTIME_STATE.md)
- [ADMIN_OPS_RUNTIME_STATE.md](D:\sanliurfa.com\sanliurfa-ops-batch-all\docs\ops\ADMIN_OPS_RUNTIME_STATE.md)
- [RELEASE_RUNTIME_STATE.md](D:\sanliurfa.com\sanliurfa-ops-batch-all\docs\ops\RELEASE_RUNTIME_STATE.md)

## Temel Komutlar

```bash
npm run dev
npm run build
npm run typecheck:app
npm run test:critical
npm run release:gate
```

## Operasyon Giriş Noktaları

- ops giriş noktası:
  - [docs/ops/README.md](D:\sanliurfa.com\sanliurfa-ops-batch-all\docs\ops\README.md)
- mimari giriş noktası:
  - [docs/architecture/README.md](D:\sanliurfa.com\sanliurfa-ops-batch-all\docs\architecture\README.md)
- kaynak gerçek haritası:
  - [docs/ops/SOURCE_OF_TRUTH_MAP.md](D:\sanliurfa.com\sanliurfa-ops-batch-all\docs\ops\SOURCE_OF_TRUTH_MAP.md)

## Kural

- Günlük karar için önce kısa özet yüzeyleri aç.
- sahiplik belirsizse `docs/ops/SOURCE_OF_TRUTH_MAP.md` kullan.
- Tarihsel kayıt gerekiyorsa `docs/archive/` altına git; aktif karar için archive kullanma.
