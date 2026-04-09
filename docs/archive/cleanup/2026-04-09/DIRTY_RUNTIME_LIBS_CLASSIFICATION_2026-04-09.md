# Runtime Libs Cleanup Refresh (2026-04-09)

## Summary
- Snapshot source: `D:\sanliurfa.com\sanliurfa`
- Cleanup branch scope: `src/lib/postgres.ts`, `src/lib/marketing-automation.ts`, `src/lib/__tests__/governance-policy.test.ts`, `src/migrations/032_user_blocking.ts`

## Applied Scope
- restore `delete` compatibility export in `src/lib/postgres.ts`
- fix invalid regexp construction in `src/lib/marketing-automation.ts`
- narrow governance policy test imports to their source modules and align builder usage
- replace SQL-style comment markers outside template strings in `src/migrations/032_user_blocking.ts`

## Verification Goal
- keep runtime-libs cleanup isolated from page and webhook buckets
- ensure build and targeted governance-policy test stay green
