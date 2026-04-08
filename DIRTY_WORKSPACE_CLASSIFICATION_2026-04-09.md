# Dirty Workspace Classification (2026-04-09)

## Summary
- Source workspace reviewed read-only: `D:\sanliurfa.com\sanliurfa`
- Total open entries: `297`
- Modified: `27`
- Deleted: `3`
- Untracked: `267`
- Highest concentration: `src/` (`250` entries), `e2e/` (`4` entries), plus root-level `PHASE_*.md` files

## Classified Buckets
- `runtime-pages`: tracked edits under `src/pages/**` and `src/components/**`
  - Examples: `src/pages/admin/dashboard.astro`, `src/pages/blog/[slug].astro`, `src/components/weather/WeatherWidget.astro`
  - Risk: user-facing behavior drift, requires manual review before merge.
- `runtime-libs`: tracked edits under shared libraries and migrations
  - Examples: `src/lib/postgres.ts`, `src/lib/marketing-automation.ts`, `src/migrations/032_user_blocking.ts`
  - Risk: infra and data-path regressions if mixed with phase delivery work.
- `webhook-surface`: tracked edits in `src/lib/webhook-*.ts`
  - Examples: analytics, audit, filters, logs, replay, templates
  - Risk: likely coherent subsystem; should move together.
- `governance-backfill`: mostly untracked `src/lib/governance-*`, `policy-*`, `compliance-*`, `trust-*`, `board-*`, tests, and root `PHASE_*.md`
  - Risk: overlaps with delivered phase stream; isolate before deciding salvage vs discard.
- `e2e-suite`: untracked or modified Playwright assets under `e2e/`
  - Risk: independent from governance work; treat as separate branch.

## Cleanup Branch Plan
- `cleanup/dirty-runtime-pages`
  - Move tracked page/component edits only.
- `cleanup/dirty-runtime-libs`
  - Move tracked lib + migration edits that affect app/runtime behavior.
- `cleanup/dirty-webhook-surface`
  - Move `src/lib/webhook-*` edits as one subsystem branch.
- `cleanup/dirty-governance-backfill`
  - Move untracked governance libs/tests/docs for audit against merged phase history.
- `cleanup/dirty-e2e-suite`
  - Move `e2e/` work independently.

## Recommended Sequence
1. Snapshot current dirty state with `git status --short > dirty-workspace-inventory.txt` in the source workspace.
2. Create cleanup branches from the source workspace, one bucket at a time.
3. Compare `governance-backfill` candidates against merged phase commits before keeping anything.
4. Only after branch isolation, reduce the source workspace back to a readable baseline.

## Guardrail
- Do not clean the source workspace with blanket resets or deletes.
- Any destructive action should happen only after the bucket has been isolated into a dedicated branch.
