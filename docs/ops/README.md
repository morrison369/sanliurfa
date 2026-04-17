# Ops Doküman İndeksi

Bu klasör operasyon kararları için açılacak ilk yerdir.

## Hangi belge ne zaman açılır

- Release gate / merge blocker:
  - [RELEASE_GATES.md](D:\sanliurfa.com\sanliurfa-ops-batch-all\docs\RELEASE_GATES.md)
  - [BRANCH_PROTECTION.md](D:\sanliurfa.com\sanliurfa-ops-batch-all\docs\ops\BRANCH_PROTECTION.md)
- Artifact freshness / nightly drift:
  - [ARTIFACT_FRESHNESS_POLICY.md](D:\sanliurfa.com\sanliurfa-ops-batch-all\docs\ops\ARTIFACT_FRESHNESS_POLICY.md)
  - [ARTIFACT_RETENTION_POLICY.md](D:\sanliurfa.com\sanliurfa-ops-batch-all\docs\ops\ARTIFACT_RETENTION_POLICY.md)
  - [admin-access-coverage.md](D:\sanliurfa.com\sanliurfa-ops-batch-all\docs\reports\admin-access-coverage.md)
- Hangi dosya source-of-truth:
  - [SOURCE_OF_TRUTH_MAP.md](D:\sanliurfa.com\sanliurfa-ops-batch-all\docs\ops\SOURCE_OF_TRUTH_MAP.md)
- Astro-only mimari geçiş değerlendirmesi:
  - [ASTRO_ONLY_MIGRATION_ASSESSMENT.md](D:\sanliurfa.com\sanliurfa-ops-batch-all\docs\architecture\ASTRO_ONLY_MIGRATION_ASSESSMENT.md)
  - [ASTRO_ONLY_MIGRATION_BACKLOG.md](D:\sanliurfa.com\sanliurfa-ops-batch-all\docs\architecture\ASTRO_ONLY_MIGRATION_BACKLOG.md)
  - [astro-hydration-inventory.md](D:\sanliurfa.com\sanliurfa-ops-batch-all\docs\reports\astro-hydration-inventory.md)
  - [astro-high-risk-feasibility.md](D:\sanliurfa.com\sanliurfa-ops-batch-all\docs\reports\astro-high-risk-feasibility.md)
  - [react-surface-audit.md](D:\sanliurfa.com\sanliurfa-ops-batch-all\docs\reports\react-surface-audit.md)
  - [react-surface-classification.md](D:\sanliurfa.com\sanliurfa-ops-batch-all\docs\reports\react-surface-classification.md)
- Admin UI helper / view-model katmanı:
  - `src/lib/admin-format.ts`
  - `src/lib/admin-index-data.ts`
  - `src/lib/admin-index.ts`
  - `src/lib/admin-index-page.ts`
  - `src/lib/admin-index-view.ts`
  - `src/lib/admin-ops-pages.ts`
  - `src/lib/runtime-monitor.ts`
  - `src/lib/admin-access-coverage-page.ts`
  - `src/lib/admin-dom.ts`
  - `src/lib/admin-page-bootstrap.ts`
  - browser smoke:
    - `src/scripts/__tests__/runtime-monitor-page.test.ts`
    - `src/scripts/__tests__/admin-access-coverage-page.test.ts`
- Incident aninda bakilacak sira:
  - [INCIDENT_RUNBOOK.md](D:\sanliurfa.com\sanliurfa-ops-batch-all\docs\ops\INCIDENT_RUNBOOK.md)
- Admin entegrasyon readiness:
  - [INTEGRATION_READINESS.md](D:\sanliurfa.com\sanliurfa-ops-batch-all\docs\ops\INTEGRATION_READINESS.md)
- Legacy / aktif olmayan yüzey:
  - [LEGACY_PHASE_SURFACE.md](D:\sanliurfa.com\sanliurfa-ops-batch-all\docs\ops\LEGACY_PHASE_SURFACE.md)
- Script yüzeyi ve gate policy:
  - [SCRIPT_SURFACE_POLICY.md](D:\sanliurfa.com\sanliurfa-ops-batch-all\docs\SCRIPT_SURFACE_POLICY.md)

## Hızlı kullanım sırası

1. Merge veya deploy bloklandıysa `RELEASE_GATES.md`
2. Incident varsa `INCIDENT_RUNBOOK.md`
3. Nightly issue veya artifact bayatlığı varsa `ARTIFACT_FRESHNESS_POLICY.md`
   Admin wrapper coverage için `docs/reports/admin-access-coverage.md`
4. Hangi dosya karar veriyor belirsizse `SOURCE_OF_TRUTH_MAP.md`
5. Astro-only / framework migration kararı verilecekse `docs/architecture/ASTRO_ONLY_MIGRATION_ASSESSMENT.md`
   Uygulama sırası için `docs/architecture/ASTRO_ONLY_MIGRATION_BACKLOG.md`
   Somut hydration risk listesi için `docs/reports/astro-hydration-inventory.md`
   High bucket sıralaması için `docs/reports/astro-high-risk-feasibility.md`
   Paket seviyesinde React kaldırma blokörleri için `docs/reports/react-surface-audit.md`
   Dosya bazlı sil / tut / migrate sınıflaması için `docs/reports/react-surface-classification.md`
6. Admin anahtarları ve readiness için `INTEGRATION_READINESS.md`
7. Legacy yüzey şüphesi varsa `LEGACY_PHASE_SURFACE.md`
8. Admin UI davranışı veya ops sayfa metni değişecekse önce helper katmanına bak, sonra `.astro` / page script dosyasını değiştir

## Kural

- Yeni operasyon yüzeyi eklenirse önce bu index, sonra source-of-truth haritası güncellenir.
