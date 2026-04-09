# Dirty Workspace Classification Refresh (2026-04-09)

## Summary
- Snapshot source: `D:\sanliurfa.com\sanliurfa`
- Refresh captured after Phase 785-802 merge and before webhook cleanup isolation.
- Current cleanup branch scope: `src/lib/webhook-analytics.ts`, `src/lib/webhook-audit.ts`, `src/lib/webhook-filters.ts`, `src/lib/webhook-logs.ts`, `src/lib/webhook-replay.ts`, `src/lib/webhook-templates.ts`

## Buckets
- `webhook-surface`: six modified library files; all changes are `import { Pool }` -> `import type { Pool }` hygiene fixes.
- `runtime-pages`: admin, blog, profil, sosyal, arama, and API route edits remain outside this branch.
- `runtime-libs`: `postgres`, `marketing-automation`, `governance-policy.test.ts`, and migration changes remain outside this branch.
- `phase-backfill`: large root-level untracked phase docs and governance libs remain outside this branch.

## Decision
- Isolate `webhook-surface` first because the bucket is small, low-risk, and already classified.
- Verification in this clean worktree shows the six webhook files are already normalized on top of `origin/master`.
- No source patch is required in this branch; only the refreshed snapshot and verification notes are retained.
- Leave every other dirty bucket untouched; they need separate worktrees and review.

## Verification Goal
- Ensure the webhook surface no longer imports `Pool` as a runtime value when only the type is needed.
- Confirm whether the cleanup still needs to be ported or has already landed upstream.
- Preserve runtime behavior; this remains an import hygiene concern only.
