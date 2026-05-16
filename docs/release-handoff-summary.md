# Release Handoff - 2026-05-15

Bu handoff son toplu Astro/public gate ve operasyon calismalarindan sonra projenin devredilebilir durumunu ozetler.

## Release Gate Durumu
- `quality:metrics`: passed
- `api:release:gate`: passed
- Release readiness: ready_with_advisories
- `release:astro:gate`: passed
- `release:public` local mode: passed with `RELEASE_PUBLIC_E2E=0 RELEASE_PUBLIC_PROD_SMOKE=0`
- `test:unit`: passed (381/381 files / 4957/4957 tests)
- `test:e2e:report`: passed (critical/chromium, 30/31 passed, 0 failed, 1 skipped)
- `lint`: passed
- E2E Redis env: `.env` `REDIS_URL` / `REDIS_PASSWORD` okunuyor, `REDIS_KEY_PREFIX=e2e:sanliurfa:`, `E2E_RATE_LIMIT_BYPASS=1`
- E2E izolasyon notu: test:e2e:clean should not run in parallel with build, gate:done, release:public, or cleanup jobs because they share dev server lifecycle and port 4321.
- E2E advisory: latest isolated E2E run passed after site_settings read-cache/in-flight dedupe; previous non-blocking slow-query warning was not reproduced.

## Kalite Durumu
- Lint: `0 errors / 0 warnings / 0 problems`
- Type-check: `0 errors / 0 warnings / 0 hints`
- `@ts-nocheck`: `0 / 1484`
- OpenAPI route current/baseline: `0 / 0`
- problem+json offender: `0`
- Script surface: `370 script / 65 family / 0 top-level`
- Build artifact: `14.64 MB` (soft budget ok)
- DB usage audit: `ok`
- DB retirement observation: `observation_required`
- Zero-result search report: `ok`
- Local upload parity: `ok` (0 missing refs)
- Local upload classification: `empty` (0 candidate / 0 archive)
- Local media storage gate: `ok` (local-only: yes, external object storage: no, live 5/5)
- Google Maps scraper readiness: `ok` (local storage only: yes)
- Google Maps discovery drafts: `ok` (447 existing / 0 pending)
- Ollama readiness: `ok` (cloud, key present)
- Content agent drafts: `ok` (487 total / 0 pending / stale 0)
- PageSpeed API-less Lighthouse: `review` (api no, perf 0.85, a11y n/a, best 0.77, seo 1)

## Yenilenen Artefaktlar
- `docs/release-readiness.json`
- `docs/release-readiness.md`
- `docs/release-readiness-dashboard.json`
- `docs/script-surface-report.json`
- `docs/build-artifact-report.json`
- `docs/db-usage-audit.json`
- `docs/db-retirement-observation-report.json`
- `docs/search-zero-result-report.json`
- `docs/local-upload-parity-report.json`
- `docs/local-upload-candidate-classification.json`
- `docs/local-media-storage-gate.json`
- `docs/gmaps-scraper-readiness-report.json`
- `docs/gmaps-query-plan-report.json`
- `docs/gmaps-discovery-plan-report.json`
- `docs/gmaps-discovery-drafts-report.json`
- `docs/ollama-readiness-report.json`
- `docs/content-agent-drafts-report.json`
- `docs/pagespeed-api-less-lighthouse-report.json`
- `docs/release-artifact-freshness.json`
- `docs/e2e-report.json`
- `docs/e2e-report.md`
- `docs/release-handoff-2026-05-15.md`
- `quality-metrics.json`

## Advisory Notları
1. DB P0 retirement observation: 2 P0 quarantine candidate gözlem kuyruğunda. Runtime hold: 1. Otomatik drop yok; owner/source/migration kanıtı ve production gözlemi gerekir.

## Bilgi Notları
1. Immutable migration duplicate baseline: 3 duplicate number group(s), 14 duplicate slug group(s). Dosya rename prod schema_migrations versiyonlarını etkileyebileceği için docs/MIGRATION_DUPLICATE_REMEDIATION.md planıyla yönetilmeli. Baseline ile birebir eşleşiyor; yeni regresyon yok.
2. Migration duplicate drift: Duplicate baseline uyumlu; 3 number group, 14 slug group immutable baseline içinde.
3. Script canonical surface: 15 canonical command, 0 missing, 370 total package scripts.
4. Blog duplicate risk gate: 0 selected duplicate-risk topic; 43 duplicate-risk topic skipped, auto-publish kapali.
5. Build artifact budget snapshot: dist/client 14.64 MB, _astro budget uyumlu.
6. Release next actions: 7 aksiyon, 0 kanıt/gözlem bekleyen madde.
7. Release artifact freshness: passed; stale/missing=0, max age=180 minutes.
8. Release handoff summary: Generated at 2026-05-15T12:05:13.615Z; status=ready_with_advisories, local-storage=ok, pagespeed-api-less=review.
9. Unit tests: 381/381 test file, 4957/4957 test passed.
10. API contract groups: 11 API contract group passed.
11. API release gate report: 5/5 API release checks passed.
12. API debug envelope: 3/3 debug envelope check passed. RequestId, X-Request-ID and frontend fetch diagnostics are tracked.
13. E2E report: critical / chromium: 30/31 passed, 0 failed.
14. E2E skip report: 17 E2E skip declaration, 0 undocumented.
15. E2E critical coverage: 10/10 critical flow covered, 0 missing.
16. DB usage audit: 497 tablo, 766 reviewable unused-index adayı, 280 protected zero-scan index, 3 speculative zero-row candidate raporlandı.
17. DB retirement observation: P0 quarantine=2, runtime hold=1, P1=0, P2=766. Otomatik drop yok; en erken aksiyon 2026-05-29T12:07:47.159Z.
18. DB P0 quarantine plan: 2 quarantine candidate, 1 runtime hold. Automatic drop/quarantine yok.
19. DB observation cadence: 3/14 snapshot, 11 eksik gün, status=observing.
20. DB observation calendar: 3/14 observation day complete; next snapshot=2026-05-16T12:04:43.938Z, earliest action=2026-05-29T12:04:43.938Z, auto drop yok.
21. DB manual decision readiness: 0 ready, 2 waiting, 1 runtime hold.
22. DB registry classification: 0 unclassified table, 766 reviewable unused index, 280 protected zero-scan index. Automatic DB drop disabled.
23. DB runtime hold plan: public.campaign_performance runtime_hold; refs=2, incompatible contracts=1, auto drop yok.
24. SQL parameter safety: 0 unsafe SQL parameter pattern found.
25. DB prod/current version compare: DATABASE_URL localhost/sanliurfa: 188/188 source migration matched, 0 pending/unmatched, 4 DB-only.
26. DB index review plan: 766 reviewable index candidate, 505 high-risk keep/review. Automatic index drop disabled.
27. DB advisory evidence bundle: 2 quarantine candidate, 1 runtime hold, observation 3/14. Automatic DB/index drop disabled.
28. Zero-result search report: 0 unresolved query / 0 occurrence.
29. Local upload parity: 928 upload dosyası, 0 missing ref, 0 unreferenced candidate.
30. Local upload bucket quota: 5 bucket, 0 blocker, 0 review, 0 advisory.
31. Local upload candidate classification: 0 candidate: 0 observed, 0 archive candidate, 0 delete-review. Otomatik silme yok.
32. Local upload archive candidates: 0 manual archive PR candidate, 0 delete-review. Otomatik silme yok.
33. Local media storage gate: local-only=yes, external-object-storage=no, live checks=5/5, failed patterns=0.
34. Static image integrity gate: 200 local public image checked; failed=0, review=0. CDN/object-storage varsayımı yok.
35. Media readiness: 5/5 media checks passed; uploads=928, public-images=200, local-storage-only=yes.
36. Admin strict role gate: 32/32 high-impact admin endpoint strict role checks passed; review=0.
37. Unit skip report: 0 skipped test file, 0 skipped test, 0 undocumented skip declaration.
38. Redis runtime health: idle; 127.0.0.1:6381 ping=fail. Fallback release blocker değil.
39. Warmup safety: ok; warmup yeni port/dev server açmamalı ve sadece mevcut base URL fetch etmelidir.
40. Cron readiness: 16/16 managed cron job preview içinde mevcut.
41. LLMS/Sitemap auto update: 6/6 auto-update check geçti. llms.txt, llms-full.txt, sitemap index, section sitemap, dynamic sitemap ve robots discovery izleniyor.
42. Blog rich results: 40/40 blog draft rich results/schema parity check geçti; review=0.
43. Blog draft quality: 40/40 blog draft content quality/source safety check gecti; review=0.
44. Blog publish readiness: 40 blog draft prod ortamda published/existing; issues=0, autoPublish=false.
45. Blog admin publish queue: 40 blog draft admin review kuyrugunda; quality=40, rich=40, autoPublish=false.
46. Publish all content drafts: 0 draft-like content remains; city_content_drafts updated=0, moderation auto-approved=no.
47. PageSpeed API research: PageSpeed API service enabled=yes, local-storage policy=documented.
48. PageSpeed API-less Lighthouse: 0/1 Lighthouse CLI check ok; API used=no, status=review, perf=0.85, best=0.77, seo=1.
49. PageSpeed live check: 0/0 live checks ok; quota-limited=1.
50. PageSpeed quota management: Quota management marked=yes, completed=yes, live status=review, quota-limited=1.
51. Backend/frontend improvements: 14/14 improvement checks passed; backend=9/9, frontend=5/5.

## Onay Gerektiren Isler
- Credential/key rotation
- Git history cleanup / force-push / repo public visibility degisikligi
- Admin moderasyon backlog kararlarinin toplu uygulanmasi

## Guvenli Tekrar Kontrol Komutlari
```bash
npm run quality:metrics
npm run release:astro:gate
$env:RELEASE_PUBLIC_E2E="0"; $env:RELEASE_PUBLIC_PROD_SMOKE="0"; npm run release:public
npm run release:readiness:report
npm run security:scan-secrets
npm run jobs:places:sla-alert
npm run release:handoff
```
