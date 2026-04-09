# Phase Operations Guide

## Purpose
This file standardizes the repo's phase delivery flow so worktree, PR creation, merge verification, and Astro build behavior are handled consistently.

## Phase Branch Flow
1. Create a clean worktree from `origin/master`.
2. Run `npm ci` in the worktree.
3. Generate or update the phase block.
4. Run the serialized wrapper first so `phase:sync:tsconfig` and `phase:check:tsconfig` cannot race:
   - `npm run phase:prepare:block -- --phase-script test:phase:<range>`
5. Commit the phase block.
6. Run `npm run phase:changelog:head` and commit the changelog update.

## Commit Standard
- Keep two commits per phase branch:
  - `Phase <range>: ...`
  - `Chore: update phase changelog for <range>`
- Do not fold changelog edits into the phase commit. The split keeps delivery diffs and audit metadata separate.

## Check Wait Flow
CI checks can take a few seconds to publish after PR creation. Use the wrapper below instead of calling `gh pr checks` directly:

```bash
npm run phase:checks:wait -- <pr-number> --repo titanai777/sanliurfa
```

The wrapper polls until checks exist, then hands off to `gh pr checks --watch`.

## Environment Gate
- Repo target: Node `22.13.0+` and `<23`.
- Run `npm run phase:env:check` directly or via `phase:prepare:block` before delivery commands.
- If the shell is below the target, switch with `nvm use 22.13.0` before `npm ci`.
- If the shell cannot switch cleanly, use the preferred-node wrapper:
  - `npm run phase:env:check:preferred`
  - `npm run phase:prepare:block:preferred -- --phase-script test:phase:<range>`

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

For npm-safe PR creation without long quoted flags, use file-based inputs:

```bash
npm run phase:pr:open:file -- titanai777/sanliurfa master <branch> PR_TITLE.txt PR_BODY.md
```

## Astro Constraints
- SSR-first runtime with `@astrojs/node` standalone adapter.
- Avoid route collisions in `src/pages/`.
- Keep content loader/schema changes paired with `src/content/` updates.
- `astro-compress` exclusions must target the emitted `sw.js` service worker file.

## Dirty Workspace Cleanup Order
Do not operate phase deliveries in the dirty root worktree.
Recommended cleanup order:
1. `cleanup/dirty-webhook-surface`
2. runtime pages
3. runtime libs
4. remaining phase/backfill artifacts
