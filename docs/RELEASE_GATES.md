# Release Gates

## Required Gate Sequence
1. `npm run repo:stabilize:check`
2. `npm run governance:imports:check`
3. `npm run db:drift:check`
4. `npm run phase:doctor`
5. `npm run deps:audit:triage`
6. `npm run phase:check:tsconfig`
7. `npm run test:unit -- src/lib/__tests__/report-engine-excel-smoke.test.ts`
8. `npm run test:e2e:smoke`
9. `npm run build`

## Single Command
```bash
npm run release:gate
```

## CI Enforcement
- `.github/workflows/ci.yml` runs stabilization, governance import guard, db drift check, and e2e smoke.
- Full E2E runs in advisory mode (`continue-on-error`) to keep merge path deterministic.
- `.github/workflows/phase-gate.yml` blocks merge on phase doctor and tsconfig checks.
