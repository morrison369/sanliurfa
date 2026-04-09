# Release Gates

## Required Gate Sequence
1. `npm run env:contract:check`
2. `npm run repo:stabilize:check`
3. `npm run governance:imports:check`
4. `npm run db:drift:check`
5. `npm run migrate:status`
6. `npm run migrate:dry-run`
7. `npm run phase:doctor`
8. `npm run deps:audit:triage`
9. `npm run typecheck:app`
10. `npm run phase:check:tsconfig`
11. `npm run test:unit -- src/lib/__tests__/report-engine-excel-smoke.test.ts`
12. `npm run test:e2e:smoke`
13. `npm run build`

> Not: `migrate:status` local ortamda DB yoksa advisory fallback ile raporlanır; CI içinde ayrı adım olarak zorunlu çalışır.

## Single Command
```bash
npm run release:gate
```

## CI Enforcement
- `.github/workflows/ci.yml` runs env contract, stabilization, governance import guard, db drift, migrate status + dry-run, app typecheck and e2e smoke.
- Full E2E runs in advisory mode (`continue-on-error`) to keep merge path deterministic.
- `.github/workflows/phase-gate.yml` blocks merge on env contract (ci), app typecheck and phase tsconfig checks.
