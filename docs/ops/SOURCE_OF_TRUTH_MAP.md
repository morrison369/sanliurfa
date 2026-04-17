# Source Of Truth Map

Bu dosya operasyon kararlarını hangi kaynakların belirlediğini tek yerde toplar.

| Konu | Source File | Contract/Test | Tüketici |
| --- | --- | --- | --- |
| Artifact freshness eşikleri | `src/lib/admin-status.ts` | `src/lib/__tests__/admin-status.test.ts` | health, performance, admin dashboard |
| Artifact health snapshot | `src/lib/artifact-health.ts` | `src/lib/__tests__/artifact-health.test.ts` | overview, metrics, deployment, health |
| Admin access coverage raporu | `scripts/admin-access-guard.ts`, `src/lib/admin-access-coverage.ts` | `npm run governance:admin:access:check`, `src/pages/api/__tests__/admin-dashboard-contracts.test.ts` | admin dashboard, metrics, release gate, nightly issues |
| Admin index SSR data + risk/tool view modeli | `src/lib/admin-index-data.ts`, `src/lib/admin-index.ts`, `src/lib/admin-index-page.ts`, `src/lib/admin-index-view.ts` | `src/lib/__tests__/admin-index-data.test.ts`, `src/lib/__tests__/admin-index.test.ts`, `src/lib/__tests__/admin-index-page.test.ts`, `src/lib/__tests__/admin-index-view.test.ts` | `src/pages/admin/index.astro` |
| Runtime monitor page davranışı | `src/lib/runtime-monitor.ts`, `src/lib/admin-ops-pages.ts` | `src/lib/__tests__/runtime-monitor.test.ts`, `src/lib/__tests__/admin-ops-pages.test.ts`, `src/scripts/__tests__/runtime-monitor-page.test.ts` | `src/pages/admin/runtime-monitor.astro`, `src/scripts/runtime-monitor-page.ts` |
| Access coverage page davranışı | `src/lib/admin-access-coverage-page.ts`, `src/lib/admin-ops-pages.ts` | `src/lib/__tests__/admin-access-coverage-page.test.ts`, `src/lib/__tests__/admin-ops-pages.test.ts`, `src/scripts/__tests__/admin-access-coverage-page.test.ts` | `src/pages/admin/access-coverage.astro`, `src/scripts/admin-access-coverage-page.ts` |
| Admin ops tarih/fallback formatı | `src/lib/admin-format.ts` | `src/lib/__tests__/admin-format.test.ts` | `src/lib/admin-index-page.ts`, `src/scripts/runtime-monitor-page.ts`, `src/scripts/admin-access-coverage-page.ts` |
| Admin ops DOM/bootstrap yardımcıları | `src/lib/admin-dom.ts`, `src/lib/admin-page-bootstrap.ts` | `src/lib/__tests__/admin-dom.test.ts`, `src/lib/__tests__/admin-page-bootstrap.test.ts` | `src/scripts/runtime-monitor-page.ts`, `src/scripts/admin-access-coverage-page.ts` |
| Astro runtime aktif durum özeti | `docs/architecture/ASTRO_RUNTIME_STATE.md`, `astro.config.mjs` | `npm run astro:react:audit`, `npm run astro:react:classify`, `npm run astro:react:guard`, `npm run astro:migration:inventory`, `npm run astro:migration:high-risk` | günlük mimari kararlar, framework durumu, compatibility layer kararı |
| Astro React integration owner | `astro.config.mjs` | `npm run astro:react:audit`, `npm run astro:react:classify`, `npm run astro:react:guard` | framework integration kararı, React compatibility layer |
| Astro-only migration kararı ve kapsamı | `docs/architecture/ASTRO_ONLY_MIGRATION_ASSESSMENT.md`, `docs/architecture/ASTRO_ONLY_MIGRATION_BACKLOG.md`, `scripts/astro-hydration-inventory.ts`, `src/lib/astro-migration-report.ts`, `scripts/astro-high-risk-feasibility.ts`, `src/lib/astro-high-risk-report.ts`, `scripts/react-surface-audit.ts`, `src/lib/react-surface-audit.ts`, `scripts/react-surface-classification.ts`, `src/lib/react-surface-classification.ts`, `scripts/react-runtime-detached-guard.ts`, `src/lib/react-runtime-detached-guard.ts` | `src/lib/__tests__/astro-migration-report.test.ts`, `src/lib/__tests__/astro-high-risk-report.test.ts`, `src/lib/__tests__/react-surface-audit.test.ts`, `src/lib/__tests__/react-surface-classification.test.ts`, `src/lib/__tests__/react-runtime-detached-guard.test.ts`, `npm run astro:migration:inventory`, `npm run astro:migration:high-risk`, `npm run astro:react:audit`, `npm run astro:react:classify`, `npm run astro:react:guard` | framework seçimi, migration kapanış/backlog kararı, hydration risk envanteri, high-risk sıralaması, React yüzey görünürlüğü, dosya bazlı React bakım sınıflaması, runtime-linked React UI guard, `astro.config.mjs` kararları |
| Release gate summary | `src/lib/release-gate-summary.ts` | `src/lib/__tests__/release-gate-summary.test.ts` | admin dashboard, nightly issues |
| Nightly regression/e2e summary | `src/lib/nightly-ops-summary.ts` | `src/lib/__tests__/nightly-ops-summary.test.ts` | admin dashboard, nightly issues |
| Runtime integration readiness | `src/lib/runtime-integration-settings.ts` | `src/pages/api/__tests__/integration-settings-contracts.test.ts` | integrations admin page, deployment status |
| Admin dashboard API kontratı | `src/pages/api/admin/dashboard/overview.ts` | `src/pages/api/__tests__/admin-dashboard-contracts.test.ts` | `src/components/AdminDashboardOverview.astro` |
| Admin metrics API kontratı | `src/pages/api/admin/system/metrics.ts` | `src/pages/api/__tests__/admin-dashboard-contracts.test.ts` | admin metrics tüketicileri |
| Runtime health/performance kontratları | `src/pages/api/health.ts`, `src/pages/api/health/detailed.ts`, `src/pages/api/performance.ts` | `src/pages/api/__tests__/runtime-ops-contracts.test.ts`, `src/pages/api/__tests__/runtime-admin-ops-contracts.test.ts` | runtime monitor, smoke, external consumers |
| OpenAPI source of truth | `src/pages/api/openapi.json.ts` | `src/pages/api/__tests__/openapi-runtime-contracts.test.ts` | API consumers, docs |
| Branch protection drift | `scripts/branch-protection-drift-check.ts` | CI `branch-protection-drift-check` | merge gate |
| Release gate orchestration | `scripts/release-gate.ts` | CI `full-gate` + `release-gate-summary` artifact | release karar yüzeyi |

Değişiklik kuralı:

- Source file değişirse ilgili test ve tüketici birlikte güncellenir.
- Yeni operasyon yüzeyi eklenirse bu tabloya eklenir.
- Drift tespiti varsa önce source-of-truth dosyası düzeltilir, sonra türev yüzeyler hizalanır.
