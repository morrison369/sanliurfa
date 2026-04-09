# Dirty Root Residual Refresh 2026-04-09

## Summary
- Source worktree reviewed: `D:\sanliurfa.com\sanliurfa`
- Reviewed from clean worktree: `D:\sanliurfa.com\sanliurfa-ops-965`
- Residual status snapshot recorded in `DIRTY_ROOT_RESIDUAL_REFRESH_2026-04-09.txt`
- Counts:
  - modified: `27`
  - deleted: `3`
  - untracked: `267`

## Bucket Classification
- `runtime-verified-modified`
  - `astro.config.mjs`
  - `public/service-worker.js`
  - `vitest.config.ts`
  - `e2e/*.spec.ts`
  - `src/pages/admin/*`, `src/pages/blog/[slug].astro`, `src/pages/places/[slug].astro`, `src/pages/profil/favoriler.astro`, `src/pages/sifre-sifirla.astro`, `src/pages/sosyal/index.astro`
  - Decision: do not replay from dirty root. Clean `origin/master` is authoritative and already carries validated cleanup passes.
- `runtime-libs-and-webhook-modified`
  - `src/lib/postgres.ts`
  - `src/lib/marketing-automation.ts`
  - `src/lib/webhook-*`
  - `src/lib/__tests__/governance-policy.test.ts`
  - `src/migrations/032_user_blocking.ts`
  - Decision: do not replay from dirty root. Runtime-libs and webhook cleanup was already merged and verified on clean history.
- `obsolete-route-deletions`
  - `src/pages/api/search.ts`
  - `src/pages/api/trending.ts`
  - `src/pages/arama.astro`
  - Decision: do not replay from dirty root. Canonical `master` already uses the non-colliding route layout.
- `legacy-governance-untracked`
  - root-level `PHASE_167_...` through `PHASE_353_...`
  - many `src/lib/*` and `src/lib/__tests__/*` governance artifacts
  - Decision: treat as stale dirty-root inventory only. Do not restore into clean history unless a future backfill explicitly requires them.
- `legacy-api-and-pages-untracked`
  - `docs/API_LEGACY_POLICY.md`
  - `src/pages/api/legacy/`
  - `src/pages/arama/gelismis.astro`
  - Decision: classify as residual exploratory work; no source patch applied in this pass.

## Result
- No source patch was replayed from the dirty root worktree in this refresh pass.
- Clean `origin/master` remains the only source of truth for code and ops documentation.
