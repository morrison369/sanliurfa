# Worktree Source Of Truth Policy

## Rule
- Delivery branches must start from `origin/master` in a clean `git worktree`.
- A dirty local root worktree is not authoritative for phase status, trackers, changelog state, or release readiness.
- Root-only local observations are advisory until confirmed in a clean worktree.

## Allowed Use Of A Dirty Root Worktree
- Inspect residual diffs.
- Refresh bucket classifications.
- Prepare cleanup plans before opening a clean branch.

## Not Allowed
- Do not update `memory.md`, `TASK_TRACKER.md`, `PHASE_INDEX.md`, or `PHASE_CHANGELOG.md` from a dirty root worktree.
- Do not open release or phase PRs from a dirty root worktree.
- Do not replay runtime, page, webhook, or support-file diffs from a dirty root without file-level justification.

## Required Docs
- `README.md`
- `AGENTS.md`
- `PHASE_OPERATIONS_GUIDE.md`
- `docs/WORKTREE_SOURCE_OF_TRUTH.md`

These documents define the operational source-of-truth policy together.

## Standard Flow
1. `git fetch origin`
2. `git worktree add <path> -b <branch> origin/master`
3. run delivery or cleanup work in the clean worktree
4. validate
5. open PR
6. merge and remove the worktree
