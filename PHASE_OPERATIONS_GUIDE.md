# Phase Operations Guide

## Baseline
- Work from a clean `git worktree` created from `origin/master`.
- Use Node `22.13.0+`; `.nvmrc` is authoritative.
- Do not run parallel Astro build or gate commands inside one worktree.

## Standard Delivery Flow
1. Generate the phase block files and exports.
   - Preferred write path: `npm run phase:generate:block:write -- scripts/phase-blocks/phase-803-808.json`
2. Update `package.json`, `PHASE_INDEX.md`, `TASK_TRACKER.md`, `memory.md`, and `tsconfig.phase.json`.
3. Run one of:
   - `npm run phase:prepare:block -- --phase-script test:phase:<range>`
   - `npm run phase:prepare:batch -- --phase-script test:phase:<range-a> --phase-script test:phase:<range-b>`
4. Commit phase content.
5. Run `npm run phase:changelog:head`, then commit the changelog update.
6. Push the branch, open the PR, wait for checks, merge, and verify remote merge state.

## Locking Rules
- `phase:prepare:block`, `phase:prepare:batch`, `test:phase:gate`, and `test:phase:gate:ci` take a worktree lock through `.phase-worktree.lock`.
- If a prior run crashes, inspect the lock file before removing it.
- Treat an existing live lock as an operational error, not a retry signal.
- Validate lock behavior through `src/lib/__tests__/phase-automation-scripts.test.ts` when changing lock or gate logic.

## PR and Merge Policy
- Keep phase content and changelog as two separate commits.
- Open PRs with `npm run phase:pr:open:file -- <repo> <base> <head> <title-file> <body-file>`.
- Wait for checks with `npm run phase:checks:wait -- <pr> --repo titanai777/sanliurfa`.
- Verify merge with `npm run phase:pr:view -- titanai777/sanliurfa <pr>`.

## Astro-Specific Guardrails
- The repo is SSR-first with `@astrojs/node`.
- Avoid route collisions and keep content collection loader/schema changes paired.
- Build and gate wrappers are serialized because `.astro/` and `dist/` artifacts are not concurrency-safe.
