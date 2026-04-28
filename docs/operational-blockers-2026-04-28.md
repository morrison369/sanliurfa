# Operasyonel Blocker Ozeti - 2026-04-28

Bu not son yerel gate calismalarindan sonra kalan release disi operasyonel konulari ayirir.

Makine-okunur artefakt:
- `docs/operational-blockers-2026-04-28.json`

## Teknik Release Durumu
- `gate:done`: passed
- `release:local-gate:summary`: ready_with_advisories
- `security:public-readiness`: passed
- `npm audit --audit-level=moderate`: 0 vulnerabilities
- Lint: passed
- Type-check: 0 errors / 0 warnings / 0 hints
- OpenAPI documented/file routes: 456 / 456
- OpenAPI P0 missing: 0
- problem+json offender: 0
- Sentry referansi: yok
- GitHub Actions workflow: yok

## Public Readiness
`npm run security:public-readiness` artik basarili.

Durum:
- Repo public durumda.
- Current tree ve tracked dosyalar public visibility icin hazir.
- Sentry/DSN/token referansi yok.
- GitHub Actions workflow dosyasi yok.

Not:
- Eski credential/key rotation runbook'u arsiv niteligindedir.
- Yeni canli credential tracked dosyaya eklenmemelidir.

## Place SLA / Moderasyon Backlog
`npm run jobs:places:sla-alert` onceki olcumlerde temizdi; smoke akislari place cleanup adimini koruyor.

Son bilinen durum:
- `pending_count`: 0
- `needs_info_count`: 0
- `pending_breached_count`: 0
- `breachedCount`: 0
- `alertedCount`: 0

Runbook:
- `docs/place-sla-backlog-runbook-2026-04-28.md`

## Advisory: Migration Duplicate Debt
Release blocker degil.

Ozet:
- Duplicate number groups: 3
- Duplicate slug groups: 14
- Rapor: `docs/migration-debt-report.md`

Yorum:
- Mevcut gate yeni regresyon olmadigini dogruluyor.
- Duzeltme DB gecmisiyle iliskili oldugu icin ayri planli migration-normalization isi olarak ele alinmali.

## Sonraki Guvenli Aksiyonlar
1. Deploy oncesi `npm run gate:done` calistir.
2. `docs/local-gate-summary.md` raporunu PR/deploy evidence olarak kullan.
3. Migration duplicate debt icin ayri, DB-first normalization planini hazirla; release blocker yapma.
