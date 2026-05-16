# Report Index

Bu dosya otomatik uretilen kalite, release ve operasyon raporlarinin indeksidir. Karar ureten kanonik dokumanlar icin `docs/SOURCE_OF_TRUTH.md` kullanilir; bu sayfadaki raporlar guncel kosum kanitidir.

## Release ve Kalite

| Rapor | Ureten komut | Kullanim |
|---|---|---|
| `quality-metrics.json` | `npm run quality:metrics` | Mevcut raporlari okuyup tek kalite ozeti uretir; read-only olmalidir. |
| `docs/quality-reports-refresh.json` | `npm run quality:reports:refresh` | Lint/typecheck ve yan raporlari tazeler. |
| `docs/quality-check-report.json` | `npm run quality:reports:refresh` | Lint ve Astro type-check sonucunu metrikler icin saklar. |
| `docs/adsense-readiness-report.json` | `npm run adsense:readiness` | `ads.txt`, AdSense meta ve crawler izinlerini local doğrular. |
| `docs/adsense-live-readiness-report.json` | `npm run adsense:readiness:live` | Canlı `ads.txt`, AdSense meta ve crawler izinlerini doğrular. |
| `docs/unit-skip-report.json` | `npm run quality:reports:refresh` | Skip edilen test deklarasyonlarini ve niyet siniflarini raporlar. |
| `docs/e2e-skip-report.json` | `npm run quality:reports:refresh` | E2E kosullu skip deklarasyonlarini ayri takip eder. |
| `docs/release-readiness.json` | `npm run release:readiness:report` | Release hazirlik karari. |
| `docs/release-readiness-dashboard.json` | `npm run release:readiness:dashboard` | Admin dashboard icin release ozet verisi. |
| `docs/release-next-actions-report.json` | `npm run release:next-actions` | Advisory maddeleri icin siradaki manuel/kanit aksiyonlarini listeler. |
| `docs/release-artifact-freshness.json` | `npm run release:artifacts:fresh` | Final oncesi rapor tazelik gate'i. |
| `docs/release-handoff-summary.json` | `npm run release:handoff` | Release kapanis ve handoff ozeti. |

## Test ve API

| Rapor | Ureten komut | Kullanim |
|---|---|---|
| `docs/unit-test-report.json` | `npm run test:unit` | Vitest unit test kosum ozeti. |
| `docs/api-contract-group-report.json` | `npm run test:api-contract:groups` | API contract grup kapsami. |
| `docs/api-release-gate-report.json` | `npm run api:release:report` | API release gate kanitlarini JSON/MD olarak ozetler. |
| `docs/e2e-report.json` | `npm run test:e2e:report` | Playwright smoke/critical suite ozeti. |
| `docs/e2e-critical-coverage-report.json` | `npm run e2e:critical:coverage` | Kritik E2E akislari icin spec/skip coverage kaniti. |
| `docs/openapi-p0-closure-report.json` | `npm run openapi:p0:report` | OpenAPI P0 kapanis raporu. |
| `docs/openapi-route-gap-baseline.json` | `npm run openapi:sync:routes:baseline` | Route/spec gap baseline. |

## Artefakt ve Operasyon

| Rapor | Ureten komut | Kullanim |
|---|---|---|
| `docs/script-surface-report.json` | `node scripts/ci/script-surface-report.mjs` | npm script envanteri ve azaltma sinyalleri. |
| `docs/script-canonical-surface-report.json` | `npm run scripts:canonical:report` | CI/deploy icin tercih edilen kanonik komut haritasi. |
| `docs/build-artifact-report.json` | `node scripts/ci/build-artifact-report.mjs` | Build/public asset boyut butceleri. |
| `docs/db-usage-audit.json` | `node scripts/ci/db-usage-audit.mjs` | DB tablo/index kullanim sinyalleri. |
| `docs/db-retirement-observation-report.json` | `npm run db:retirement:observe` | Drop/index silme oncesi gozlem kuyruğu. |
| `docs/db-p0-quarantine-plan.json` | `npm run db:p0:quarantine:plan` | P0 DB adaylari icin manuel quarantine planini uretir; otomatik drop yok. |
| `docs/db-observation-cadence-report.json` | `npm run db:observation:cadence` | 14 gunluk DB gozlem snapshot disiplinini takip eder. |
| `docs/db-manual-decision-readiness-report.json` | `npm run db:manual:decision:readiness` | Gozlem tamamlandiginda manuel PR karar hazirligini raporlar. |
| `docs/migration-duplicate-drift-report.json` | `npm run db:migrate:duplicate-drift` | Immutable duplicate migration baseline drift kontrolu. |
| `docs/search-zero-result-report.json` | `node scripts/ci/search-zero-result-report.mjs` | Arama bos sonuc backlog sinyali. |
| `docs/local-upload-parity-report.json` | `npm run images:uploads:parity` | Local upload referans, kota ve ownership raporu. |
| `docs/local-upload-bucket-quota-report.json` | `npm run images:uploads:bucket-quota` | Local upload bucket bazli soft quota raporu. |
| `docs/local-upload-candidate-classification.json` | `npm run images:uploads:classify` | Referanssiz upload observed/archive/delete-review kuyruğu. |
| `docs/local-upload-candidate-state.json` | `npm run images:uploads:classify` | Upload adaylari icin kalici `firstSeenAt` durumu. |
| `docs/local-upload-archive-candidates.json` | `npm run quality:reports:refresh` | Archive PR icin manuel aday kuyruğu; otomatik silme yapmaz. |
| `docs/local-media-storage-gate.json` | `npm run storage:local:gate` | Medyanin local filesystem modelinde kaldigini, harici nesne depolama kullanilmadigini ve canli local pathlerin cozuldugunu dogrular. |
| `docs/redis-runtime-health-report.json` | `npm run redis:runtime:health:report` | Redis ping/fallback advisory kaniti. |
| `docs/warmup-safety-report.json` | `npm run warmup:safety:report` | Warmup scriptlerinin yeni port/dev server acmadigini dogrular. |
| `docs/cron-readiness-report.json` | `npm run cron:readiness:report` | Managed CWP cron preview icinde beklenen job'lari dogrular; cron kurmaz. |
| `docs/gmaps-scraper-readiness-report.json` | `npm run gmaps:readiness` | Shared hosting Google Maps Scraper binary/CLI hazirligini ve local storage politikasini dogrular. |
| `docs/gmaps-query-plan-report.json` | `npm run gmaps:query-plan` | PostgreSQL varsa DB'den, yoksa fallback veriden `scripts/gmaps-queries.txt` uretir; satirlar `query #!#slug` formatindadir. |
| `docs/gmaps-discovery-plan-report.json` | `npm run gmaps:discovery-plan` | `kategoriler.txt` kaynakli kategori kesif sorgularini `scripts/gmaps-discovery-queries.txt` olarak uretir; places tablosunu guncellemez. |
| `docs/gmaps-discovery-drafts-report.json` | `npm run gmaps:discovery-drafts` | Google Maps kategori kesif sorgularindan admin onayli `place-discovery-draft` adaylarini dry-run olarak raporlar. |
| `docs/ollama-readiness-report.json` | `npm run ollama:readiness` | Ollama Cloud/local ayarini, API key varligini, model/fallback ve icerik scriptlerini secret yazmadan dogrular. |
| `docs/content-agent-drafts-report.json` | `npm run content:agents:drafts:report` | Admin onayli city content taslak kuyruğunu status/type ve stale pending sinyalleriyle raporlar. |
| `docs/internal-linking-report.json` | `npm run seo:internal-links:report` | İç backlink registry, kritik hub kapsami, blog entegrasyonu ve inline link stilini doğrular. |

## Kurallar

- Rapor dosyalari kanonik karar dokumani degildir; taze kosum kanitidir.
- Release oncesi `npm run quality:reports:refresh`, `npm run quality:metrics`, `npm run release:artifacts:fresh` sirasi korunur.
- Upload raporlari local filesystem modeline baglidir; CDN, S3, R2 veya object storage bu projede kullanilmaz.
