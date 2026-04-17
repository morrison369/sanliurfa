# Mimari İndeksi

Bu klasör, uzun biçimli mimari notlar içindir.

Güncel çalışma modeli:

- `CLAUDE.md` yüksek sinyalli günlük yürütme rehberidir.
- `docs/ops/README.md` operasyonel giriş noktasıdır.
- `docs/ops/SOURCE_OF_TRUTH_MAP.md` hangi kararın hangi dosyaya ait olduğunu gösterir.

`CLAUDE.md` dosyasını gereksiz büyütecek veya hızlı bayatlayacak detaylı mimari notlar için bu klasörü kullan.

Önerilen ayrım:

- alt sistem genel bakışları
- veri akışı notları
- önbellek ve geçersiz kılma stratejisi detayları
- admin arayüzü veri bağımlılık haritaları
- gerçek zamanlı / SSE mimari notları
- Astro-only migration değerlendirmeleri ve çatı sistemi geçiş notları

Önce bunları aç:

- [ASTRO_RUNTIME_STATE.md](/D:/sanliurfa.com/sanliurfa-ops-batch-all/docs/architecture/ASTRO_RUNTIME_STATE.md) - aktif runtime özeti
- [ASTRO_ONLY_MIGRATION_ASSESSMENT.md](/D:/sanliurfa.com/sanliurfa-ops-batch-all/docs/architecture/ASTRO_ONLY_MIGRATION_ASSESSMENT.md) - mevcut mimari karar
- [ASTRO_ONLY_MIGRATION_BACKLOG.md](/D:/sanliurfa.com/sanliurfa-ops-batch-all/docs/architecture/ASTRO_ONLY_MIGRATION_BACKLOG.md) - kapanış ve regresyon kuralları

Üretilen görünürlük raporları:

- [astro-hydration-inventory.md](/D:/sanliurfa.com/sanliurfa-ops-batch-all/docs/reports/astro-hydration-inventory.md)
- [astro-high-risk-feasibility.md](/D:/sanliurfa.com/sanliurfa-ops-batch-all/docs/reports/astro-high-risk-feasibility.md)
- [react-surface-audit.md](/D:/sanliurfa.com/sanliurfa-ops-batch-all/docs/reports/react-surface-audit.md)
- [react-surface-classification.md](/D:/sanliurfa.com/sanliurfa-ops-batch-all/docs/reports/react-surface-classification.md)

Tarihsel kayıt:

- [ASTRO_MIGRATION_CLOSURE_2026-04-17.md](/D:/sanliurfa.com/sanliurfa-ops-batch-all/docs/archive/migration/ASTRO_MIGRATION_CLOSURE_2026-04-17.md)

Hızlı kural:

1. Önce aktif runtime özetini aç.
2. Karar hâlâ net değilse assessment/backlog'a git.
3. Sayısal durum gerekiyorsa üretilmiş raporu aç.
4. Tarihçe gerekiyorsa arşiv kaydına git.

Kural:

- Uzun biçimli açıklamaları burada tut.
- `CLAUDE.md` dosyasını komutlar, kurallar, kaynak-gerçek yönlendirmeleri ve günlük yürütme rehberiyle sınırlı tut.
