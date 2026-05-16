# Release Readiness

- Generated At: 2026-05-15T12:08:15.833Z
- Status: ready_with_advisories
- OpenAPI P0 Total Missing: 0
- Migration Duplicate Number Groups: 3
- Migration Duplicate Slug Groups: 14

## Checks

| Check | Status | Artifact |
|---|---|---|
| OpenAPI P0 report | ok | `docs/openapi-p0-closure-report.json` |
| OpenAPI baseline | ok | `docs/openapi-route-gap-baseline.json` |
| Release next actions report | ok | `docs/release-next-actions-report.json` |
| Release artifact freshness gate | ok | `docs/release-artifact-freshness.json` |
| Release handoff summary | ok | `docs/release-handoff-summary.json` |
| Script surface report | ok | `docs/script-surface-report.json` |
| Script canonical surface report | ok | `docs/script-canonical-surface-report.json` |
| Migration duplicate drift report | ok | `docs/migration-duplicate-drift-report.json` |
| Unit test report | ok | `docs/unit-test-report.json` |
| API contract group report | ok | `docs/api-contract-group-report.json` |
| API release gate report | ok | `docs/api-release-gate-report.json` |
| API debug envelope report | ok | `docs/api-debug-envelope-report.json` |
| E2E skip report | ok | `docs/e2e-skip-report.json` |
| E2E critical coverage report | ok | `docs/e2e-critical-coverage-report.json` |
| Build artifact report | ok | `docs/build-artifact-report.json` |
| DB usage audit | ok | `docs/db-usage-audit.json` |
| DB retirement observation report | ok | `docs/db-retirement-observation-report.json` |
| DB P0 quarantine plan | ok | `docs/db-p0-quarantine-plan.json` |
| DB observation cadence report | ok | `docs/db-observation-cadence-report.json` |
| DB observation calendar report | ok | `docs/db-observation-calendar-report.json` |
| DB manual decision readiness report | ok | `docs/db-manual-decision-readiness-report.json` |
| DB registry classification report | ok | `docs/db-registry-classification-report.json` |
| DB runtime hold plan | ok | `docs/db-runtime-hold-plan.json` |
| SQL parameter safety gate | ok | `docs/sql-parameter-safety-gate.json` |
| DB prod version compare report | ok | `docs/db-prod-version-compare-report.json` |
| DB index review plan | ok | `docs/db-index-review-plan.json` |
| DB advisory evidence bundle | ok | `docs/db-advisory-evidence-bundle.json` |
| Zero-result search report | ok | `docs/search-zero-result-report.json` |
| Local upload parity report | ok | `docs/local-upload-parity-report.json` |
| Local upload bucket quota report | ok | `docs/local-upload-bucket-quota-report.json` |
| Local upload classification report | ok | `docs/local-upload-candidate-classification.json` |
| Local upload archive candidates report | ok | `docs/local-upload-archive-candidates.json` |
| Local media storage gate | ok | `docs/local-media-storage-gate.json` |
| Media readiness report | ok | `docs/media-readiness-report.json` |
| Static image integrity gate | ok | `docs/static-image-integrity-report.json` |
| Admin strict role gate | ok | `docs/admin-strict-role-gate.json` |
| Redis runtime health report | ok | `docs/redis-runtime-health-report.json` |
| Warmup safety report | ok | `docs/warmup-safety-report.json` |
| Cron readiness report | ok | `docs/cron-readiness-report.json` |
| LLMS/Sitemap auto update gate | ok | `docs/llms-sitemap-auto-update-gate.json` |
| Blog rich results report | ok | `docs/blog-draft-rich-results-report.json` |
| Blog duplicate risk gate | ok | `docs/blog-duplicate-risk-gate.json` |
| Blog draft quality report | ok | `docs/blog-draft-quality-report.json` |
| Blog publish readiness report | ok | `docs/blog-publish-readiness-report.json` |
| Blog admin publish queue report | ok | `docs/blog-admin-publish-queue-report.json` |
| Publish all content drafts report | ok | `docs/publish-all-content-drafts-report.json` |
| PageSpeed API research report | ok | `docs/pagespeed-api-research-report.json` |
| PageSpeed API-less Lighthouse report | ok | `docs/pagespeed-api-less-lighthouse-report.json` |
| PageSpeed live check report | ok | `docs/pagespeed-live-check-report.json` |
| PageSpeed quota management report | ok | `docs/pagespeed-quota-management-report.json` |
| Backend/frontend improvement report | ok | `docs/backend-frontend-improvement-report.json` |
| Unit skip report | ok | `docs/unit-skip-report.json` |
| Image manifest | ok | `public/images/image-manifest.json` |
| DB-first doc | ok | `docs/DB_FIRST_SITE_MANAGEMENT.md` |
| Public acceptance doc | ok | `docs/MVP_PUBLIC_ACCEPTANCE.md` |
| Astro frontend stack doc | ok | `docs/ASTRO_SSR_FRONTEND_STACK.md` |
| Migration duplicate remediation plan | ok | `docs/MIGRATION_DUPLICATE_REMEDIATION.md` |

## Advisories

| Advisory | Severity | Detail | Artifact |
|---|---|---|---|
| DB P0 retirement observation | advisory | 2 P0 quarantine candidate gözlem kuyruğunda. Runtime hold: 1. Otomatik drop yok; owner/source/migration kanıtı ve production gözlemi gerekir. | `docs/db-retirement-observation-report.json` |

## Notes

| Note | Severity | Detail | Artifact |
|---|---|---|---|
| Immutable migration duplicate baseline | info | 3 duplicate number group(s), 14 duplicate slug group(s). Dosya rename prod schema_migrations versiyonlarını etkileyebileceği için docs/MIGRATION_DUPLICATE_REMEDIATION.md planıyla yönetilmeli. Baseline ile birebir eşleşiyor; yeni regresyon yok. | `docs/migration-duplicate-report.json` |
| Migration duplicate drift | info | Duplicate baseline uyumlu; 3 number group, 14 slug group immutable baseline içinde. | `docs/migration-duplicate-drift-report.json` |
| Script canonical surface | info | 15 canonical command, 0 missing, 370 total package scripts. | `docs/script-canonical-surface-report.json` |
| Blog duplicate risk gate | info | 0 selected duplicate-risk topic; 43 duplicate-risk topic skipped, auto-publish kapali. | `docs/blog-duplicate-risk-gate.json` |
| Build artifact budget snapshot | info | dist/client 14.64 MB, _astro budget uyumlu. | `docs/build-artifact-report.json` |
| Release next actions | info | 7 aksiyon, 0 kanıt/gözlem bekleyen madde. | `docs/release-next-actions-report.json` |
| Release artifact freshness | info | passed; stale/missing=0, max age=180 minutes. | `docs/release-artifact-freshness.json` |
| Release handoff summary | info | Generated at 2026-05-15T12:05:13.615Z; status=ready_with_advisories, local-storage=ok, pagespeed-api-less=review. | `docs/release-handoff-summary.json` |
| Unit tests | info | 381/381 test file, 4957/4957 test passed. | `docs/unit-test-report.json` |
| API contract groups | info | 11 API contract group passed. | `docs/api-contract-group-report.json` |
| API release gate report | info | 5/5 API release checks passed. | `docs/api-release-gate-report.json` |
| API debug envelope | info | 3/3 debug envelope check passed. RequestId, X-Request-ID and frontend fetch diagnostics are tracked. | `docs/api-debug-envelope-report.json` |
| E2E report | info | critical / chromium: 30/31 passed, 0 failed. | `docs/e2e-report.json` |
| E2E skip report | info | 17 E2E skip declaration, 0 undocumented. | `docs/e2e-skip-report.json` |
| E2E critical coverage | info | 10/10 critical flow covered, 0 missing. | `docs/e2e-critical-coverage-report.json` |
| DB usage audit | info | 497 tablo, 766 reviewable unused-index adayı, 280 protected zero-scan index, 3 speculative zero-row candidate raporlandı. | `docs/db-usage-audit.json` |
| DB retirement observation | info | P0 quarantine=2, runtime hold=1, P1=0, P2=766. Otomatik drop yok; en erken aksiyon 2026-05-29T12:07:47.159Z. | `docs/db-retirement-observation-report.json` |
| DB P0 quarantine plan | advisory | 2 quarantine candidate, 1 runtime hold. Automatic drop/quarantine yok. | `docs/db-p0-quarantine-plan.json` |
| DB observation cadence | info | 3/14 snapshot, 11 eksik gün, status=observing. | `docs/db-observation-cadence-report.json` |
| DB observation calendar | advisory | 3/14 observation day complete; next snapshot=2026-05-16T12:04:43.938Z, earliest action=2026-05-29T12:04:43.938Z, auto drop yok. | `docs/db-observation-calendar-report.json` |
| DB manual decision readiness | info | 0 ready, 2 waiting, 1 runtime hold. | `docs/db-manual-decision-readiness-report.json` |
| DB registry classification | advisory | 0 unclassified table, 766 reviewable unused index, 280 protected zero-scan index. Automatic DB drop disabled. | `docs/db-registry-classification-report.json` |
| DB runtime hold plan | advisory | public.campaign_performance runtime_hold; refs=2, incompatible contracts=1, auto drop yok. | `docs/db-runtime-hold-plan.json` |
| SQL parameter safety | info | 0 unsafe SQL parameter pattern found. | `docs/sql-parameter-safety-gate.json` |
| DB prod/current version compare | info | DATABASE_URL localhost/sanliurfa: 188/188 source migration matched, 0 pending/unmatched, 4 DB-only. | `docs/db-prod-version-compare-report.json` |
| DB index review plan | info | 766 reviewable index candidate, 505 high-risk keep/review. Automatic index drop disabled. | `docs/db-index-review-plan.json` |
| DB advisory evidence bundle | info | 2 quarantine candidate, 1 runtime hold, observation 3/14. Automatic DB/index drop disabled. | `docs/db-advisory-evidence-bundle.json` |
| Zero-result search report | info | 0 unresolved query / 0 occurrence. | `docs/search-zero-result-report.json` |
| Local upload parity | info | 928 upload dosyası, 0 missing ref, 0 unreferenced candidate. | `docs/local-upload-parity-report.json` |
| Local upload bucket quota | info | 5 bucket, 0 blocker, 0 review, 0 advisory. | `docs/local-upload-bucket-quota-report.json` |
| Local upload candidate classification | info | 0 candidate: 0 observed, 0 archive candidate, 0 delete-review. Otomatik silme yok. | `docs/local-upload-candidate-classification.json` |
| Local upload archive candidates | info | 0 manual archive PR candidate, 0 delete-review. Otomatik silme yok. | `docs/local-upload-archive-candidates.json` |
| Local media storage gate | info | local-only=yes, external-object-storage=no, live checks=5/5, failed patterns=0. | `docs/local-media-storage-gate.json` |
| Static image integrity gate | info | 200 local public image checked; failed=0, review=0. CDN/object-storage varsayımı yok. | `docs/static-image-integrity-report.json` |
| Media readiness | info | 5/5 media checks passed; uploads=928, public-images=200, local-storage-only=yes. | `docs/media-readiness-report.json` |
| Admin strict role gate | info | 32/32 high-impact admin endpoint strict role checks passed; review=0. | `docs/admin-strict-role-gate.json` |
| Unit skip report | info | 0 skipped test file, 0 skipped test, 0 undocumented skip declaration. | `docs/unit-skip-report.json` |
| Redis runtime health | advisory | idle; 127.0.0.1:6381 ping=fail. Fallback release blocker değil. | `docs/redis-runtime-health-report.json` |
| Warmup safety | info | ok; warmup yeni port/dev server açmamalı ve sadece mevcut base URL fetch etmelidir. | `docs/warmup-safety-report.json` |
| Cron readiness | info | 16/16 managed cron job preview içinde mevcut. | `docs/cron-readiness-report.json` |
| LLMS/Sitemap auto update | info | 6/6 auto-update check geçti. llms.txt, llms-full.txt, sitemap index, section sitemap, dynamic sitemap ve robots discovery izleniyor. | `docs/llms-sitemap-auto-update-gate.json` |
| Blog rich results | info | 40/40 blog draft rich results/schema parity check geçti; review=0. | `docs/blog-draft-rich-results-report.json` |
| Blog draft quality | info | 40/40 blog draft content quality/source safety check gecti; review=0. | `docs/blog-draft-quality-report.json` |
| Blog publish readiness | info | 40 blog draft prod ortamda published/existing; issues=0, autoPublish=false. | `docs/blog-publish-readiness-report.json` |
| Blog admin publish queue | info | 40 blog draft admin review kuyrugunda; quality=40, rich=40, autoPublish=false. | `docs/blog-admin-publish-queue-report.json` |
| Publish all content drafts | info | 0 draft-like content remains; city_content_drafts updated=0, moderation auto-approved=no. | `docs/publish-all-content-drafts-report.json` |
| PageSpeed API research | info | PageSpeed API service enabled=yes, local-storage policy=documented. | `docs/pagespeed-api-research-report.json` |
| PageSpeed API-less Lighthouse | info | 0/1 Lighthouse CLI check ok; API used=no, status=review, perf=0.85, best=0.77, seo=1. | `docs/pagespeed-api-less-lighthouse-report.json` |
| PageSpeed live check | advisory | 0/0 live checks ok; quota-limited=1. | `docs/pagespeed-live-check-report.json` |
| PageSpeed quota management | info | Quota management marked=yes, completed=yes, live status=review, quota-limited=1. | `docs/pagespeed-quota-management-report.json` |
| Backend/frontend improvements | info | 14/14 improvement checks passed; backend=9/9, frontend=5/5. | `docs/backend-frontend-improvement-report.json` |

## DB P0 Advisory Detail

| Table | Owner | Migration Source | Note |
|---|---|---|---|
| public.campaign_metrics | marketing campaign analytics | 104_marketing_campaigns.ts | Marketing campaign v2 metrics table. Zero-row signal alone is not enough; confirm analytics endpoint and UI no longer depend on this physical table before quarantine. |
| public.campaign_segments | marketing campaign targeting | 104_marketing_campaigns.ts | Marketing campaign segment bridge. Confirm targeting API and campaign UI no longer write/read before quarantine. |

## DB P0 Quarantine Plan

| Table | State | Owner | Required Action |
|---|---|---|---|
| public.campaign_metrics | quarantine candidate | marketing campaign analytics | production observation + manual PR |
| public.campaign_segments | quarantine candidate | marketing campaign targeting | production observation + manual PR |
| public.campaign_performance | runtime hold | email/marketing campaign performance | runtime refs migrate/remove before action |

## E2E Conditional Skips

| File | Line | Reason | Expression |
|---|---:|---|---|
| `e2e/2fa.spec.ts` | 82 | auth or environment dependent | `test.skip(!authToken, 'Auth token üretilemedi, 2FA akışı atlandı.');` |
| `e2e/2fa.spec.ts` | 100 | runtime setup dependent | `test.skip(!response.ok(), `2FA setup başarısız: ${response.status()}`);` |
| `e2e/2fa.spec.ts` | 116 | runtime setup dependent | `test.skip(!setupResponse.ok(), `2FA setup başarısız: ${setupResponse.status()}`);` |
| `e2e/2fa.spec.ts` | 137 | runtime setup dependent | `test.skip(!setupResponse.ok(), `2FA setup başarısız: ${setupResponse.status()}`);` |
| `e2e/admin-site-content-live.spec.ts` | 8 | auth or environment dependent | `test.skip(getRes.status() === 401 \|\| getRes.status() === 403, 'Admin site settings require auth when E2E bypass is unavailable');` |
| `e2e/admin-site-content-live.spec.ts` | 26 | runtime setup dependent | `test.skip(!putRes.ok(), 'Admin hero publish is unavailable in this E2E environment');` |
| `e2e/analytics/realtime-metrics.spec.ts` | 42 | auth or environment dependent | `test.skip(true, 'Admin auth seed is unavailable for SSE header check in this E2E profile');` |
| `e2e/blog.spec.ts` | 42 | seed data dependent | `test.skip(!href, 'No blog post seeded in test database');` |
| `e2e/loyalty/admin-rewards.spec.ts` | 29 | seed data dependent | `test.skip(true, 'Admin role seed is unavailable in this E2E profile');` |
| `e2e/loyalty/admin-rewards.spec.ts` | 52 | seed data dependent | `test.skip(true, 'Admin role seed is unavailable in this E2E profile');` |
| `e2e/loyalty/admin-rewards.spec.ts` | 105 | seed data dependent | `test.skip(true, 'Admin role seed is unavailable in this E2E profile');` |
| `e2e/loyalty/admin-rewards.spec.ts` | 126 | seed data dependent | `test.skip(true, 'Admin role seed is unavailable in this E2E profile');` |
| `e2e/messaging.spec.ts` | 91 | seed data dependent | `test.skip(messages.length === 0, 'Current E2E seed returned no readable messages for this conversation');` |
| `e2e/social/hashtags.spec.ts` | 25 | seed data dependent | `test.skip(true, 'No hashtag seed data is available in this E2E profile');` |
| `e2e/social-phase1.spec.ts` | 83 | environment schema dependent | `test.skip(true, 'Lokal ortamda sosyal şema migration tamamlanmamış');` |
| `e2e/social-phase1.spec.ts` | 104 | environment schema dependent | `test.skip(true, 'Lokal ortamda sosyal şema migration tamamlanmamış');` |
| `e2e/social-phase1.spec.ts` | 122 | environment schema dependent | `test.skip(true, 'Lokal ortamda sosyal şema migration tamamlanmamış');` |

Summary: Temel artefaktlar mevcut. Advisory maddeleri release notlarında takip edilmeli.