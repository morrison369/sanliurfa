# Live Status (2026-04-10)

## Release Gate
- `npm run release:gate:local`: passing on current branch.
- `npm run typecheck:app`: passing.
- `npm run typecheck:experimental`: passing.

## Test Gates
- `npm run test:critical`: intended merge-blocking safety gate for API contracts, auth hardening, and webhook policy.
- `npm run test:regression:unit`: full unit regression (currently contains unrelated legacy failures and is advisory until cleaned).
- `npm run test:regression:e2e`: full Playwright regression.

## Known Gaps
- Full `vitest run` still has existing legacy failures outside merge-blocking scope.
- Webhook delivery tables had historical schema drift; reconciliation migration `128_webhook_delivery_reconciliation` is the canonical fix path.

## Canonical Commands
```bash
npm run test:critical
npm run release:gate:local
npm run test:regression:unit
npm run test:regression:e2e
```
