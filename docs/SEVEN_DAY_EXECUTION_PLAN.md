# 7-Day Execution Plan

## Day 1
- Stabilize repo hygiene (`repo:stabilize:check`)
- Freeze legacy endpoint list

## Day 2
- Complete API migration headers and redirects
- Confirm client migration owners

## Day 3
- Finalize Astro route canonicalization and search route cleanup
- Validate service worker cache rotation

## Day 4
- Group governance imports via public surface (`src/lib/governance/index.ts`)
- Refactor downstream imports to avoid direct phase-version coupling

## Day 5
- Harden webhook security (idempotency + redaction + metrics accuracy)
- Run targeted regression tests

## Day 6
- Stabilize E2E smoke subset (`2fa`, `loyalty`, `messaging`)
- Tune flaky retry and quarantine handling

## Day 7
- Execute full release gate
- Publish release note with rollback and observability section
