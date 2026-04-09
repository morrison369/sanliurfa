# Phase Operations Guide

## Baseline
- Work from a clean `git worktree` created from `origin/master`.
- Use Node `22.13.0+`; `.nvmrc` is authoritative.
- Do not run parallel Astro build or gate commands inside one worktree.
- Do not use a dirty local root worktree as a phase source of truth; use it only for residual diff inventory.
- Run `npm run phase:doctor` whenever source-of-truth docs or changelog behavior changed.
- Keep [STALE_WORKTREE.md](STALE_WORKTREE.md), [ROOT_INVENTORY_ONLY_POLICY.md](ROOT_INVENTORY_ONLY_POLICY.md), and [docs/ACTIVE_DOCS.md](docs/ACTIVE_DOCS.md) aligned.
- Keep [ARCHITECTURE.md](ARCHITECTURE.md), [docs/DEPENDENCY_TRIAGE.md](docs/DEPENDENCY_TRIAGE.md), and [docs/SCRIPT_SURFACE_POLICY.md](docs/SCRIPT_SURFACE_POLICY.md) aligned with operator reality.

## Standard Delivery Flow
1. Generate the phase block files and exports.
   - Preferred write path: `npm run phase:generate:block:write -- scripts/phase-blocks/phase-803-808.json`
2. Update `package.json`, `PHASE_INDEX.md`, `TASK_TRACKER.md`, `memory.md`, and `tsconfig.phase.json`.
3. Run one of:
   - `npm run phase:prepare:block -- --phase-script test:phase:<range>`
   - `npm run phase:prepare:batch -- --phase-script test:phase:<range-a> --phase-script test:phase:<range-b>`
   - `npm run test:phase:range -- <range>`
   - `npm run test:phase:batch -- <range-a> <range-b> <range-c>`
4. Commit phase content.
5. Capture the phase commit hash and run `npm run phase:changelog -- --ref <phase-commit>`, then commit the changelog update.
6. Do not append changelog-maintenance chore rows for `update/normalize/finalize/refresh phase changelog`.
7. If `phase:doctor` reports changelog drift, run `npm run phase:changelog:normalize` and commit the cleanup before PR open.
8. Push the branch, open the PR, wait for checks, merge, and verify remote merge state.

## Locking Rules
- `phase:prepare:block`, `phase:prepare:batch`, `test:phase:gate`, and `test:phase:gate:ci` take a worktree lock through `.phase-worktree.lock`.
- If a prior run crashes, inspect the lock file before removing it.
- Treat an existing live lock as an operational error, not a retry signal.
- Validate lock behavior through `src/lib/__tests__/phase-automation-scripts.test.ts` when changing lock or gate logic.

## PR and Merge Policy
- Keep phase content and changelog as two separate commits.
- Cleanup verification PRs must not append cleanup-only rows to `PHASE_CHANGELOG.md`.
- Open PRs with `npm run phase:pr:open:file -- <repo> <base> <head> <title-file> <body-file>`.
- Wait for checks with `npm run phase:checks:wait -- <pr> --repo titanai777/sanliurfa`.
- Verify merge with `npm run phase:pr:view -- titanai777/sanliurfa <pr>`.

## Documentation Hygiene
- Keep active operational docs in root only when they are part of the current delivery surface.
- Move historical phase reports and dated cleanup verification notes under `docs/archive/`.
- `PHASE_INDEX.md` is the canonical map for both active root docs and archived locations.
- `README.md`, `AGENTS.md`, `PHASE_OPERATIONS_GUIDE.md`, and `docs/WORKTREE_SOURCE_OF_TRUTH.md` must not drift on source-of-truth policy.
- `STALE_WORKTREE.md` and `ROOT_INVENTORY_ONLY_POLICY.md` are mandatory visible guards in repo root.

## Script Surface Policy
- Prefer runner-based commands:
  - `test:phase:range`
  - `test:phase:batch`
  - `phase:prepare:block:preferred`
  - `phase:prepare:batch:preferred`
- Treat single `test:phase:<range>` entries as compatibility surface for generated phase blocks, not the primary operator interface.
- Review the current surface with `npm run phase:scripts:report` before changing package scripts.
- Use `docs/SCRIPT_SURFACE_POLICY.md` as the repo-level rule for compatibility vs runner-first commands.

## Astro-Specific Guardrails
- The repo is SSR-first with `@astrojs/node`.
- Avoid route collisions and keep content collection loader/schema changes paired.
- Build and gate wrappers are serialized because `.astro/` and `dist/` artifacts are not concurrency-safe.
- Use `ARCHITECTURE.md` as the runtime source for Astro invariants; keep this guide focused on phase operations.
