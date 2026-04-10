# Execution Backlog (P1/P2/P3)

## P1 (Blocking Reliability)
- Canonicalize Stripe ingestion on `/api/webhooks/stripe`; keep `/api/billing/webhook` as legacy compatibility surface only.
- Keep `test:critical:blocking` green on every PR (`auth`, `oauth`, `webhook`, core contract libs).
- Enforce migration tracker parity:
  - Every non-versioned migration file must be listed in `migration-tracker.json`.
  - Tracker entries must have valid status.
  - Tracker must not reference versioned `NNN_*.ts` migrations.
- Keep release gate mandatory on default branch.

## P2 (Observability and Runtime Signals)
- Monitor OAuth funnel metrics from admin APIs:
  - `GET /api/auth/oauth/authorize`
  - `GET /api/auth/oauth/callback`
- Track webhook ingestion SLO telemetry:
  - duplicate deliveries
  - retry deferred
  - retry exhausted
  - p95 latency and error rate
- Nightly regression issue should always include:
  - run outcome
  - top failing tests summary
  - migration summary
  - short trend over recent runs

## P3 (Repository Hygiene and Velocity)
- Keep `scripts/` count within budget by extending existing scripts instead of adding one-off files.
- Keep broad contract suites in `test:critical:advisory` and run as non-blocking in PR flow.
- Archive legacy phase snapshots under `docs/archive/phases/` while preserving required root phase governance files.

## Two-Week Delivery Plan
1. Week 1:
   - Stabilize migration parity + critical blocking gates.
   - Land webhook business logic convergence.
   - Validate CI timings after blocking/advisory split.
2. Week 2:
   - Expand dashboard consumption of OAuth + webhook SLO summaries.
   - Tune nightly regression summaries with trend signal quality.
   - Finalize docs/archive cleanup and update onboarding docs.
