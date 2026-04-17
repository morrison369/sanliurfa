# Kaynak Gercek Haritasi

Bu dosya operasyon kararlarını hangi kaynakların belirlediğini tek yerde toplar.

| Konu | Kaynak Dosya | Kontrat/Test | Tüketici |
| --- | --- | --- | --- |
| Artefact tazelik esikleri | `src/lib/admin-status.ts` | `src/lib/__tests__/admin-status.test.ts` | saglik, performans, admin paneli |
| Artefact saglik ozeti | `src/lib/artifact-health.ts` | `src/lib/__tests__/artifact-health.test.ts` | genel bakis, metrikler, dagitim, saglik |
| Surum/runtime aktif durum ozeti | `docs/ops/RELEASE_RUNTIME_STATE.md`, `docs/RELEASE_GATES.md`, `docs/ops/BRANCH_PROTECTION.md`, `docs/ops/ARTIFACT_FRESHNESS_POLICY.md` | `npm run branch:protection:drift:check`, `npm run release:gate` | gunluk surum karari, kapi ozeti, runtime operasyon sirasi |
| Entegrasyon hazirlik aktif durum ozeti | `docs/ops/INTEGRATION_RUNTIME_STATE.md`, `docs/ops/INTEGRATION_READINESS.md` | `npm run release:gate:local`, `src/pages/api/__tests__/integration-settings-contracts.test.ts` | gunluk hazirlik karari, admin entegrasyon paneli, saglik entegrasyon gorunurlugu |
| Olay mudahale aktif durum ozeti | `docs/ops/INCIDENT_RUNTIME_STATE.md`, `docs/ops/INCIDENT_RUNBOOK.md` | `npm run release:gate`, `npm run test:critical:blocking`, `npm run test:critical:advisory` | olay ilk aksiyon sirasi, kok/artefact/surum/admin entegrasyon ayrimi |
| Admin ops aktif runtime özeti | `docs/ops/ADMIN_OPS_RUNTIME_STATE.md`, `scripts/admin-access-guard.ts` | `npm run governance:admin:access:check`, `npm run test:critical:advisory` | günlük ops kararı, wrapper coverage durumu, admin runtime özeti |
| Admin erisim kapsama raporu | `scripts/admin-access-guard.ts`, `src/lib/admin-access-coverage.ts` | `npm run governance:admin:access:check`, `src/pages/api/__tests__/admin-dashboard-contracts.test.ts` | admin paneli, metrikler, surum kapisi, gece raporlari |
| Admin indeks SSR veri + risk/arac gorunum modeli | `src/lib/admin-index-data.ts`, `src/lib/admin-index.ts`, `src/lib/admin-index-page.ts`, `src/lib/admin-index-view.ts` | `src/lib/__tests__/admin-index-data.test.ts`, `src/lib/__tests__/admin-index.test.ts`, `src/lib/__tests__/admin-index-page.test.ts`, `src/lib/__tests__/admin-index-view.test.ts` | `src/pages/admin/index.astro` |
| Runtime izleme sayfasi davranisi | `src/lib/runtime-monitor.ts`, `src/lib/admin-ops-pages.ts` | `src/lib/__tests__/runtime-monitor.test.ts`, `src/lib/__tests__/admin-ops-pages.test.ts`, `src/scripts/__tests__/runtime-monitor-page.test.ts` | `src/pages/admin/runtime-monitor.astro`, `src/scripts/runtime-monitor-page.ts` |
| Erisim kapsama sayfasi davranisi | `src/lib/admin-access-coverage-page.ts`, `src/lib/admin-ops-pages.ts` | `src/lib/__tests__/admin-access-coverage-page.test.ts`, `src/lib/__tests__/admin-ops-pages.test.ts`, `src/scripts/__tests__/admin-access-coverage-page.test.ts` | `src/pages/admin/access-coverage.astro`, `src/scripts/admin-access-coverage-page.ts` |
| Admin ops tarih/fallback formatı | `src/lib/admin-format.ts` | `src/lib/__tests__/admin-format.test.ts` | `src/lib/admin-index-page.ts`, `src/scripts/runtime-monitor-page.ts`, `src/scripts/admin-access-coverage-page.ts` |
| Admin ops DOM/bootstrap yardımcıları | `src/lib/admin-dom.ts`, `src/lib/admin-page-bootstrap.ts` | `src/lib/__tests__/admin-dom.test.ts`, `src/lib/__tests__/admin-page-bootstrap.test.ts` | `src/scripts/runtime-monitor-page.ts`, `src/scripts/admin-access-coverage-page.ts` |
| Astro runtime aktif durum ozeti | `docs/architecture/ASTRO_RUNTIME_STATE.md`, `astro.config.mjs` | `npm run astro:react:audit`, `npm run astro:react:classify`, `npm run astro:react:guard`, `npm run astro:migration:inventory`, `npm run astro:migration:high-risk` | gunluk mimari kararlar, cati sistemi durumu, uyumluluk katmani karari |
| Astro React entegrasyon sahibi | `astro.config.mjs` | `npm run astro:react:audit`, `npm run astro:react:classify`, `npm run astro:react:guard` | cati sistemi entegrasyon karari, React uyumluluk katmani |
| Astro-only migration karari ve kapsami | `docs/architecture/ASTRO_ONLY_MIGRATION_ASSESSMENT.md`, `docs/architecture/ASTRO_ONLY_MIGRATION_BACKLOG.md`, `scripts/astro-hydration-inventory.ts`, `src/lib/astro-migration-report.ts`, `scripts/astro-high-risk-feasibility.ts`, `src/lib/astro-high-risk-report.ts`, `scripts/react-surface-audit.ts`, `src/lib/react-surface-audit.ts`, `scripts/react-surface-classification.ts`, `src/lib/react-surface-classification.ts`, `scripts/react-runtime-detached-guard.ts`, `src/lib/react-runtime-detached-guard.ts` | `src/lib/__tests__/astro-migration-report.test.ts`, `src/lib/__tests__/astro-high-risk-report.test.ts`, `src/lib/__tests__/react-surface-audit.test.ts`, `src/lib/__tests__/react-surface-classification.test.ts`, `src/lib/__tests__/react-runtime-detached-guard.test.ts`, `npm run astro:migration:inventory`, `npm run astro:migration:high-risk`, `npm run astro:react:audit`, `npm run astro:react:classify`, `npm run astro:react:guard` | cati sistemi secimi, migration kapanis/backlog karari, hydration risk envanteri, high-risk siralamasi, React yuzey gorunurlugu, dosya bazli React bakim siniflamasi, runtime baglantili React arayuz korumasi, `astro.config.mjs` kararlari |
| Surum kapisi ozeti | `src/lib/release-gate-summary.ts` | `src/lib/__tests__/release-gate-summary.test.ts` | admin paneli, gece raporlari |
| Gece regression/e2e ozeti | `src/lib/nightly-ops-summary.ts` | `src/lib/__tests__/nightly-ops-summary.test.ts` | admin paneli, gece raporlari |
| Runtime entegrasyon hazirligi | `src/lib/runtime-integration-settings.ts` | `src/pages/api/__tests__/integration-settings-contracts.test.ts` | admin entegrasyon sayfasi, dagitim durumu |
| Admin dashboard API kontratı | `src/pages/api/admin/dashboard/overview.ts` | `src/pages/api/__tests__/admin-dashboard-contracts.test.ts` | `src/components/AdminDashboardOverview.astro` |
| Admin metrics API kontratı | `src/pages/api/admin/system/metrics.ts` | `src/pages/api/__tests__/admin-dashboard-contracts.test.ts` | admin metrics tüketicileri |
| Runtime health/performance kontratları | `src/pages/api/health.ts`, `src/pages/api/health/detailed.ts`, `src/pages/api/performance.ts` | `src/pages/api/__tests__/runtime-ops-contracts.test.ts`, `src/pages/api/__tests__/runtime-admin-ops-contracts.test.ts` | runtime monitor, smoke, external consumers |
| OpenAPI kaynak gercegi | `src/pages/api/openapi.json.ts` | `src/pages/api/__tests__/openapi-runtime-contracts.test.ts` | API tuketicileri, dokumanlar |
| Branch protection kaymasi | `scripts/branch-protection-drift-check.ts` | CI `branch-protection-drift-check` | birlestirme kapisi |
| Surum kapisi orkestrasyonu | `scripts/release-gate.ts` | CI `full-gate` + `release-gate-summary` artefact'i | surum karar yuzeyi |

Değişiklik kuralı:

- Kaynak dosya degisirse ilgili test ve tuketici birlikte guncellenir.
- Yeni operasyon yüzeyi eklenirse bu tabloya eklenir.
- Drift tespiti varsa once kaynak gercek dosyasi duzeltilir, sonra turev yuzeyler hizalanir.
