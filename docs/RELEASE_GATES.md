# Release Gates

## Required Gate Sequence
1. `npm run env:contract:check`
2. `npm run repo:stabilize:check`
3. `npm run security:secrets:scan`
4. `npm run governance:imports:check`
5. `npm run governance:cache:redis:check`
6. `npm run governance:querymany:check`
7. `npm run governance:migrations:contract:check`
8. `npm run db:drift:check`
9. `npm run db:test:bootstrap`
10. `npm run migrate:status`
11. `npm run migrate:dry-run`
12. `npm run phase:doctor`
13. `npm run deps:audit:triage`
14. `npm run typecheck:app`
15. `npm run phase:check:tsconfig`
16. `npm run test:unit -- src/lib/__tests__/report-engine-excel-smoke.test.ts`
17. `npm run test:e2e:smoke`
18. `npm run build`

> Not: `migrate:status` local ortamda DB yoksa advisory fallback ile raporlanır; CI içinde ayrı adım olarak zorunlu çalışır.

## Single Command
```bash
npm run release:gate
```

## Local Command
```bash
npm run release:gate:local
```

- `release:gate` mevcut shell env'i ile çalışır.
- `release:gate:local` sırasıyla `.env.production`, `.env.local`, `.env` dosyalarını yükler ve ardından gate'i çalıştırır.
- Lokal varsayılan PostgreSQL/Redis hedefleri repo içindeki `docker-compose.dev.yml` ile hizalıdır:
  - `postgresql://postgres:postgres@127.0.0.1:5432/sanliurfa`
  - `redis://127.0.0.1:6379`
- `db:test:bootstrap` önce hedef `DATABASE_URL` bağlantısını doğrular; yalnızca erişim yoksa admin bağlantısı ile DB oluşturmayı dener.
- Legacy guard’lar:
  - `governance:cache:redis:check`: `redis` proxy import’larında artışı bütçe ile sınırlar
  - `governance:querymany:check`: `queryMany(...).rows` kalıbını yasaklar
  - `governance:migrations:contract:check`: migration kontrat drift’ini bütçe ile sınırlar

## CI Enforcement
- `.github/workflows/ci.yml` (master) runs env contract, stabilization, secret scan, governance import guard, db drift, test DB bootstrap, migrate status + dry-run, app typecheck and e2e smoke.
- Full E2E runs in advisory mode (`continue-on-error`) to keep merge path deterministic.
- `.github/workflows/phase-gate.yml` blocks merge on env contract (ci), secret scan, app typecheck and phase tsconfig checks.

## SLO Note
- `test:e2e:smoke` route başına yanıt süresi bütçesi uygular (`SMOKE_MAX_MS`, varsayılan `2000`).
- `test:e2e:pwa` manifest, service worker ve offline fallback artefact’larını Chromium browser smoke ile doğrular.
