# Branch Protection Baseline

Apply these rules on `main` and `master`:

- Require pull request before merge.
- Require status checks to pass before merge.
- Require up-to-date branch before merge.
- Block force-push and branch deletion.

Required checks:
- `quick-gate`
- `full-gate` (for protected branch push flow)
- `critical-observability-guard` (covered inside gate, keep visible in run summary)

Recommended advisory checks:
- `critical-contracts-advisory`
- `e2e-smoke-advisory`

Operational note:
- `critical-contracts-advisory` is intentionally non-blocking to keep PR velocity while still surfacing drift in broader contract suites.
