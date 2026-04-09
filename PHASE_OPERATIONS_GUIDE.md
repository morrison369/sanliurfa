# Phase Operations Guide

## Purpose
This file standardizes the repo's phase delivery flow so worktree, PR creation, merge verification, and Astro build behavior are handled consistently.

## Phase Branch Flow
1. Create a clean worktree from `origin/master`.
2. Run `npm ci` in the worktree.
3. Generate or update the phase block.
4. Run:
   - `npm run test:phase:<range>`
   - `npm run test:phase:smoke`
   - `npm run test:phase:gate:ci`
5. Commit the phase block.
6. Run `npm run phase:changelog:head` and commit the changelog update.

## PR Flow
Use API-first PR creation because `gh pr create` can intermittently return false negatives for fresh phase branches.

```bash
npx tsx scripts/phase-pr.ts open \
  --repo titanai777/sanliurfa \
  --base master \
  --head <branch> \
  --title "Phase <range>: ..." \
  --body-file <pr-body-file>
```

After merge attempts, treat remote PR state as authoritative:

```bash
npx tsx scripts/phase-pr.ts view --repo titanai777/sanliurfa --pr <number>
```

## Astro Constraints
- SSR-first runtime with `@astrojs/node` standalone adapter.
- Avoid route collisions in `src/pages/`.
- Keep content loader/schema changes paired with `src/content/` updates.
- `astro-compress` exclusions must target the emitted `sw.js` service worker file.

## Node Version
- Local and CI target: Node `22.13.0`.
- `.nvmrc` and GitHub workflows should stay aligned to that version.

## Dirty Workspace Cleanup Order
Do not operate phase deliveries in the dirty root worktree.
Recommended cleanup order:
1. `cleanup/dirty-webhook-surface`
2. runtime pages
3. runtime libs
4. remaining phase/backfill artifacts
