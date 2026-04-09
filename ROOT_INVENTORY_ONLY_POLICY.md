# Root Inventory-Only Policy

## Decision
- The dirty local root worktree is not an implementation source.
- No runtime, webhook, page, weather, E2E, or support-file patch may be replayed from the dirty root without explicit file-level justification.
- Clean `origin/master` worktrees remain the only delivery surface.

## Allowed Use
- Read-only diff inspection
- Residual bucket classification
- Recovery planning before a clean branch is opened

## Not Allowed
- Do not update trackers, changelog, or phase metadata from the dirty root.
- Do not open release or phase PRs from the dirty root.
- Do not use bulk restore or broad replay from dirty root inventory.

## Related Docs
- [STALE_WORKTREE.md](STALE_WORKTREE.md)
- [docs/WORKTREE_SOURCE_OF_TRUTH.md](docs/WORKTREE_SOURCE_OF_TRUTH.md)
- [docs/ACTIVE_DOCS.md](docs/ACTIVE_DOCS.md)
