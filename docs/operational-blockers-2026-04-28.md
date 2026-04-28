# Operasyonel Blocker Ozeti - 2026-04-28

Bu not teknik release gate'leri temizlendikten sonra kalan release disi operasyonel blocker'lari ayirir.

Makine-okunur artefakt:
- `docs/operational-blockers-2026-04-28.json`

## Teknik Release Durumu
- `quality:metrics`: temiz
- Lint: `0 errors / 0 warnings / 0 problems`
- Type-check: `0 errors / 0 warnings / 0 hints`
- OpenAPI route current/baseline: `0 / 0`
- API release gate: `passed`
- `gate:done`: passed
- `ops:next:bulk`: passed

## Public Readiness Blocker
`npm run security:public-readiness` sonucu repo public yapilmaya hazir degil.

Blocker'lar:
- Git history icinde `deploy_key` gecmisi var.
- Git history icinde eski credential literal'lari var.

Runbook:
- `docs/public-readiness-runbook-2026-04-28.md`

Gereken operasyon:
- Ilgili deploy key ve credential'lar rotate edilmeli.
- Git history temizligi planli ve onayli sekilde yapilmali.
- History rewrite/destructive risk tasidigi icin otomatik uygulanmadi.

## Place SLA / Moderasyon Backlog
`npm run jobs:places:sla-alert` teknik olarak basarili. Backlog temizlendi; onceki artis smoke test kayitlarindan kaynaklaniyordu.

Son olcum:
- `slaHours`: 48
- `cooldownHours`: 24
- `pending_count`: 0
- `needs_info_count`: 0
- `pending_breached_count`: 0
- `breachedCount`: 0
- `alertedCount`: 0

Runbook:
- `docs/place-sla-backlog-runbook-2026-04-28.md`

Yorum:
- Bu bir kod/gate blocker degil.
- Admin moderasyon/SLA is kuyrugu temizligi gerektiriyor.
- `alertedCount=0`, mevcut cooldown veya notification policy nedeniyle yeni alarm uretilmedigini gosterir.

## Sonraki Guvenli Aksiyonlar
1. Public readiness icin credential rotation + history cleanup planini onayli operasyon olarak ele al.
2. Admin panelden place submission/moderasyon backlog'unu temizle.
3. Smoke akislari degisirse `jobs:places:sla-alert` yeniden calistir.
