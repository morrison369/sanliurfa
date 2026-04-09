The stale root worktree at `D:\sanliurfa.com\sanliurfa` remains inventory-only.

## Decision
- do not replay runtime, webhook, page, weather, e2e, or support-file diffs from the dirty root
- keep `origin/master` as the only authoritative source for active delivery work
- use the dirty root only for read-only forensics and file-by-file recovery requests

## Why
- the same buckets were already validated and normalized in clean PR-first worktrees
- replaying the stale root diff risks reintroducing inline-script regressions, route collisions, and obsolete deletions
- the root branch is still `phase-449-454-v18`, so its file surface is not operationally trustworthy

## Operational rule
- new deliveries continue from clean worktrees off `origin/master`
- any future recovery from the root must be explicit, narrow, and justified per file
