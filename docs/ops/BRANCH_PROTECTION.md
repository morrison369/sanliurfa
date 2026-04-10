# Branch Protection Baseline

Apply these rules on `main` and `master`:

- Require pull request before merge.
- Require status checks to pass before merge.
- Require up-to-date branch before merge.
- Block force-push and branch deletion.

Required checks:
- `quick-gate`

Protected branch push checks:
- `full-gate`

Recommended advisory checks:
- `critical-contracts-advisory`
- `e2e-smoke-advisory`

Operational note:
- `critical-contracts-advisory` is intentionally non-blocking to keep PR velocity while still surfacing drift in broader contract suites.
- Blocking karar sadece job isimleri üzerinden verilir; step isimleri branch protection required check listesine yazılmaz.
