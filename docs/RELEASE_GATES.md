# Release Gates

## Required Gate Sequence
1. `npm run repo:stabilize:check`
2. `npm run phase:doctor`
3. `npm run deps:audit:triage`
4. `npm run phase:check:tsconfig`
5. `npm run test:unit -- src/lib/__tests__/report-engine-excel-smoke.test.ts`
6. `npm run build`

## Single Command
```bash
npm run release:gate
```

## CI Enforcement
- `.github/workflows/ci.yml` runs `repo:stabilize:check` and `release:gate`.
- `.github/workflows/phase-gate.yml` blocks merge on phase doctor and tsconfig checks.
