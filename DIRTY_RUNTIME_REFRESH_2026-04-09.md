# Runtime Refresh Cleanup (2026-04-09)

## Summary
- Snapshot source: `D:\sanliurfa.com\sanliurfa`
- Cleanup scope: `public/service-worker.js`, `vitest.config.ts`, `e2e/2fa.spec.ts`, `e2e/loyalty.spec.ts`, `e2e/messaging.spec.ts`, `e2e/privacy.spec.ts`
- Reviewed but not patched: `astro.config.mjs` dirty diff, because `master` already carries a stronger exclude rule for both `service-worker.js` and `sw.js`

## Applied Scope
- normalize nullable auth token capture in Playwright specs
- initialize deferred string ids/tokens to safe defaults in e2e suites
- default Vitest runtime to `node` and document per-test jsdom opt-in
- normalize service worker warning string to ASCII-safe form

## Verification Goal
- keep runtime refresh isolated from page, webhook, and governance phase buckets
- ensure Astro server build remains green after runtime/testing hygiene changes
