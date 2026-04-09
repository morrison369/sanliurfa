# Stale Root Worktree Warning

This repository may exist locally as a dirty or stale root worktree.

## Binding Rule
- Do not use `D:\sanliurfa.com\sanliurfa` as a delivery surface when it is behind `origin/master` or contains residual diffs.
- Delivery, cleanup, and release work must start from a clean `git worktree` created from `origin/master`.
- The dirty root worktree is inventory-only. It is valid for forensic inspection, not for source-of-truth decisions.

## Use Instead
- [README.md](README.md)
- [AGENTS.md](AGENTS.md)
- [PHASE_OPERATIONS_GUIDE.md](PHASE_OPERATIONS_GUIDE.md)
- [docs/WORKTREE_SOURCE_OF_TRUTH.md](docs/WORKTREE_SOURCE_OF_TRUTH.md)
- [ROOT_INVENTORY_ONLY_POLICY.md](ROOT_INVENTORY_ONLY_POLICY.md)

## Minimum Safe Flow
1. `git fetch origin`
2. `git worktree add <path> -b <branch> origin/master`
3. run phase or cleanup work in the clean worktree
4. validate with `npm run phase:doctor`
5. open PR and merge from the clean worktree
