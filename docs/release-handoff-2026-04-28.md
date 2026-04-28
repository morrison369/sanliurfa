# Release Handoff - 2026-04-28

Bu handoff son toplu gate ve operasyon calismalarindan sonra projenin devredilebilir durumunu ozetler.

## Release Gate Durumu
- `gate:done`: passed
- `release:local-gate:summary`: ready_with_advisories
- `security:public-readiness`: passed
- `npm audit --audit-level=moderate`: 0 vulnerabilities
- `lint`: passed
- `type-check`: passed
- `build`: passed
- `api:release:gate`: passed
- `social:core:gate:strict`: passed
- `public:city:gate`: passed
- GitHub Actions: kullanilmiyor, workflow dosyasi yok
- Sentry: projeden tamamen kaldirildi

## Kalite Durumu
- Type-check: `0 errors / 0 warnings / 0 hints`
- OpenAPI documented/file routes: `456 / 456`
- OpenAPI P0 missing: `0`
- problem+json offender: `0`
- Secret scan: high-risk secret yok
- Public readiness: current tree public visibility icin hazir

## Yenilenen Artefaktlar
- `docs/local-gate-summary.json`
- `docs/local-gate-summary.md`
- `docs/migration-debt-report.json`
- `docs/migration-debt-report.md`
- `docs/release-readiness.json`
- `docs/release-readiness.md`
- `docs/operational-blockers-2026-04-28.json`
- `docs/operational-blockers-2026-04-28.md`

## Kalan Release Blocker
Yok.

## Advisory
1. `migration-duplicate-debt`: advisory
   - Duplicate number groups: 3
   - Duplicate slug groups: 14
   - Release blocker degil; ayri migration-normalization planinda ele alinmali.

## Guvenli Tekrar Kontrol Komutlari
```bash
npm run gate:done
npm audit --audit-level=moderate
npm run security:public-readiness
npm run release:local-gate:summary
```
