# Artifact Retention Policy

Bu politika CI artifact lifecycle ve kalici admin ops audit saklama kurallarini tanimlar.

## GitHub Actions Artifact Retention

- `weekly-typecheck-report`: 14 gun
- `release-gate-summary`: 14 gun
- `performance-ops-summary`: 14 gun
- `nightly-unit-regression`: 14 gun
- `nightly-playwright-report`: 14 gun
- `nightly-performance-ops-summary`: 14 gun

## Local Retention

- `logs/admin-ops-audit.jsonl`: 30 gun
- `docs/reports/` altindaki timestamped summary/log dosyalari: 14 gun

## Source Of Truth

- CI retention: [.github/workflows/ci.yml](D:\sanliurfa.com\sanliurfa-ops-batch-all\.github\workflows\ci.yml)
- Nightly retention:
  - [.github/workflows/nightly-regression.yml](D:\sanliurfa.com\sanliurfa-ops-batch-all\.github\workflows\nightly-regression.yml)
  - [.github/workflows/nightly-e2e.yml](D:\sanliurfa.com\sanliurfa-ops-batch-all\.github\workflows\nightly-e2e.yml)
- Local cleanup script:
  - [apply-ops-retention.ts](D:\sanliurfa.com\sanliurfa-ops-batch-all\scripts\apply-ops-retention.ts)

## Enforcement

- CI ve nightly workflow'lari artifact upload sirasinda retention gunu belirtir.
- `npm run ops:retention:apply` local retention cleanup uygular.
