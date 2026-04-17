# Astro Runtime State

Bu belge, migration kapandıktan sonraki aktif runtime durumunu tek yerde özetler.

## Güncel Durum

2026-04-17 itibarıyla:

- aktif `.tsx` yüzeyi: `0`
- aktif `client:*` hydration: `0`
- React hook/lib blokörü: `0`
- config dışı runtime React owner: `0`
- kalan tek compatibility owner:
  - `astro.config.mjs`

## Anlamı

- Uygulamanın aktif UI runtime'ı Astro + plain TypeScript modelindedir.
- `@astrojs/react` kaldırılmamıştır.
- `react` ve `react-dom` kaldırılmamıştır.
- Bu paketler aktif UI owner olarak değil, kontrollü compatibility layer olarak tutulur.

## Aktif Karar

- Yeni UI yüzeyi varsayılan olarak `.astro`
- Etkileşim gerekiyorsa plain TypeScript browser helper
- React ancak açık ve bilinçli bir mimari kararla geri dönebilir

## Guard ve Görünürlük

Bu durum aşağıdaki komutlarla korunur:

- `npm run astro:react:guard`
- `npm run astro:react:audit`
- `npm run astro:react:classify`
- `npm run astro:migration:inventory`
- `npm run astro:migration:high-risk`

## Detay Kaynaklar

- [ASTRO_ONLY_MIGRATION_ASSESSMENT.md](/D:/sanliurfa.com/sanliurfa-ops-batch-all/docs/architecture/ASTRO_ONLY_MIGRATION_ASSESSMENT.md)
- [ASTRO_ONLY_MIGRATION_BACKLOG.md](/D:/sanliurfa.com/sanliurfa-ops-batch-all/docs/architecture/ASTRO_ONLY_MIGRATION_BACKLOG.md)
- [astro-hydration-inventory.md](/D:/sanliurfa.com/sanliurfa-ops-batch-all/docs/reports/astro-hydration-inventory.md)
- [astro-high-risk-feasibility.md](/D:/sanliurfa.com/sanliurfa-ops-batch-all/docs/reports/astro-high-risk-feasibility.md)
- [react-surface-audit.md](/D:/sanliurfa.com/sanliurfa-ops-batch-all/docs/reports/react-surface-audit.md)
- [react-surface-classification.md](/D:/sanliurfa.com/sanliurfa-ops-batch-all/docs/reports/react-surface-classification.md)
