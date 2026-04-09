# Dirty Governance Backfill Refresh 2026-04-09

## Summary
- Source worktree reviewed: `D:\sanliurfa.com\sanliurfa`
- Reviewed from clean worktree: `D:\sanliurfa.com\sanliurfa-ops-983`
- Snapshot file: `DIRTY_GOVERNANCE_BACKFILL_REFRESH_2026-04-09.txt`
- Count highlights:
  - legacy phase docs: `38`
  - untracked `src/lib/*`: `226`
  - untracked `src/lib/__tests__/*`: `32`

## Classification
- `legacy-phase-docs`
  - root-level `PHASE_167_172_*` through `PHASE_353_358_*`
  - Decision: stale dirty-root artifacts only; do not restore into clean history.
- `legacy-governance-lib-backfill`
  - large untracked governance module surface under `src/lib/`
  - Decision: treat as abandoned or superseded backfill inventory unless a future backport explicitly needs individual files.
- `legacy-governance-test-backfill`
  - matching untracked governance test surface under `src/lib/__tests__/`
  - Decision: do not replay blindly; tests are coupled to stale module inventory.
- `legacy-api-and-page-exploration`
  - `docs/API_LEGACY_POLICY.md`
  - `src/pages/api/legacy/`
  - `src/pages/arama/gelismis.astro`
  - Decision: keep as residual inventory only. No source patch applied in this pass.

## Result
- No stale untracked governance/backfill file was replayed into clean history.
- Clean `origin/master` remains the only source of truth.
- Future action, if needed, should be selective archival or targeted cherry-pick, not bulk restore.
