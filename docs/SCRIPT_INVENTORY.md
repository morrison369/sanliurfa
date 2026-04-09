# Script Inventory

## Active Gate/CI Scripts
- `scripts/release-gate.ts`
- `scripts/repo-stabilization-check.ts`
- `scripts/governance-import-guard.ts`
- `scripts/db-drift-check.ts`
- `scripts/db-test-bootstrap.ts`
- `scripts/migration-dry-run.ts`
- `scripts/env-contract-check.ts`
- `scripts/security-secrets-scan.ts`
- `scripts/e2e-smoke.ts`
- `scripts/phase-doctor.ts`
- `scripts/dependency-triage.ts`

## Policy
- `scripts/archive/legacy-insecure/` altındaki scriptler deprecated kabul edilir.
- Bu klasördeki scriptler CI/release gate içinde asla çağrılmaz.
- Hardcoded host/password/connection-string içeren scriptler aktif yüzeye geri taşınamaz.
- Yeni operasyon scriptleri env tabanlı olmalı ve `security:secrets:scan` kontrolünden geçmelidir.

## Ownership
- Gate/CI scriptleri: release engineering owner.
- Legacy operasyon scriptleri: yalnızca forensics/reference amaçlı arşivde tutulur.
