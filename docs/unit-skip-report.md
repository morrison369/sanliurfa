# Unit Skip Report

- Generated at: 2026-05-15T12:08:14.100Z
- Status: ok
- Observed skipped test files: 0
- Observed skipped tests: 0
- Static skip declarations: 4
- Undocumented declarations: 0

## By Reason

| Reason | Count |
|---|---:|
| build artifact dependent | 4 |

## Declarations

| File | Line | Reason | Expression |
|---|---:|---|---|
| `src/lib/__tests__/bundle-size-baseline.test.ts` | 58 | build artifact dependent | `it.skipIf(!sizes)('CSS bundle within budget (≤ 400 KB)', () => {` |
| `src/lib/__tests__/bundle-size-baseline.test.ts` | 62 | build artifact dependent | `it.skipIf(!sizes)('JS bundle total within budget (≤ 1900 KB)', () => {` |
| `src/lib/__tests__/bundle-size-baseline.test.ts` | 66 | build artifact dependent | `it.skipIf(!sizes)('JS chunk count within budget (≤ 130)', () => {` |
| `src/lib/__tests__/bundle-size-baseline.test.ts` | 70 | build artifact dependent | `it.skipIf(!sizes)('reports current sizes (informational)', () => {` |
