# Source Of Truth Map

Bu dosya operasyon kararlarını hangi kaynakların belirlediğini tek yerde toplar.

| Konu | Source File | Contract/Test | Tüketici |
| --- | --- | --- | --- |
| Artifact freshness eşikleri | `src/lib/admin-status.ts` | `src/lib/__tests__/admin-status.test.ts` | health, performance, admin dashboard |
| Artifact health snapshot | `src/lib/artifact-health.ts` | `src/lib/__tests__/artifact-health.test.ts` | overview, metrics, deployment, health |
| Release gate summary | `src/lib/release-gate-summary.ts` | `src/lib/__tests__/release-gate-summary.test.ts` | admin dashboard, nightly issues |
| Nightly regression/e2e summary | `src/lib/nightly-ops-summary.ts` | `src/lib/__tests__/nightly-ops-summary.test.ts` | admin dashboard, nightly issues |
| Runtime integration readiness | `src/lib/runtime-integration-settings.ts` | `src/pages/api/__tests__/integration-settings-contracts.test.ts` | integrations admin page, deployment status |
| Admin dashboard API kontratı | `src/pages/api/admin/dashboard/overview.ts` | `src/pages/api/__tests__/admin-dashboard-contracts.test.ts` | `src/components/AdminDashboardOverview.tsx` |
| Admin metrics API kontratı | `src/pages/api/admin/system/metrics.ts` | `src/pages/api/__tests__/admin-dashboard-contracts.test.ts` | admin metrics tüketicileri |
| Runtime health/performance kontratları | `src/pages/api/health.ts`, `src/pages/api/health/detailed.ts`, `src/pages/api/performance.ts` | `src/pages/api/__tests__/runtime-ops-contracts.test.ts`, `src/pages/api/__tests__/runtime-admin-ops-contracts.test.ts` | runtime monitor, smoke, external consumers |
| OpenAPI source of truth | `src/pages/api/openapi.json.ts` | `src/pages/api/__tests__/openapi-runtime-contracts.test.ts` | API consumers, docs |
| Branch protection drift | `scripts/branch-protection-drift-check.ts` | CI `branch-protection-drift-check` | merge gate |
| Release gate orchestration | `scripts/release-gate.ts` | CI `full-gate` + `release-gate-summary` artifact | release karar yüzeyi |

Değişiklik kuralı:

- Source file değişirse ilgili test ve tüketici birlikte güncellenir.
- Yeni operasyon yüzeyi eklenirse bu tabloya eklenir.
- Drift tespiti varsa önce source-of-truth dosyası düzeltilir, sonra türev yüzeyler hizalanır.
