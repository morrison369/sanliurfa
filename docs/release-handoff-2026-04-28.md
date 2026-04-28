# Release Handoff - 2026-04-28

Bu handoff son toplu gate ve operasyon calismalarindan sonra projenin devredilebilir durumunu ozetler.

## Release Gate Durumu
- `quality:metrics`: passed
- `api:release:gate`: passed
- `ops:targeted:release-lite`: passed
- `gate:done`: passed
- `ops:next:bulk`: passed
- `test:unit`: passed (132 files / 707 tests)
- `test:e2e:clean`: passed (96 passed / 10 skipped)
- `lint`: passed
- E2E Redis env: `.env` `REDIS_URL` / `REDIS_PASSWORD` okunuyor, `REDIS_KEY_PREFIX=e2e:sanliurfa:`, `E2E_RATE_LIMIT_BYPASS=1`
- E2E izolasyon notu: test:e2e:clean should not run in parallel with build, gate:done, release-lite, or cleanup jobs because they share dev server lifecycle and port 4321.
- E2E advisory: latest isolated E2E run passed after site_settings read-cache/in-flight dedupe; previous non-blocking slow-query warning was not reproduced.

## Kalite Durumu
- Lint: `0 errors / 0 warnings / 0 problems`
- Type-check: `0 errors / 0 warnings / 0 hints`
- `@ts-nocheck`: `0 / 1484`
- OpenAPI route current/baseline: `0 / 0`
- problem+json offender: `0`

## Yenilenen Artefaktlar
- `docs/release-readiness.json`
- `docs/release-readiness.md`
- `docs/release-handoff-2026-04-28.md`
- `docs/operational-blockers-2026-04-28.json`
- `docs/operational-blockers-2026-04-28.md`
- `quality-metrics.json`

## Kalan Release Disi Blockerlar
1. public-readiness-history-secrets: blocked (critical)

## Onay Gerektiren Isler
- Credential/key rotation
- Git history cleanup / force-push / repo public visibility degisikligi
- Admin moderasyon backlog kararlarinin toplu uygulanmasi

## Guvenli Tekrar Kontrol Komutlari
```bash
npm run quality:metrics
npm run release:readiness:report
npm run security:scan-secrets
npm run jobs:places:sla-alert
npm run release:handoff
```
