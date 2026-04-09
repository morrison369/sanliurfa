# Local Worktree Cleanup Plan

## Goal
Reduce unrelated diffs in future phase branches without losing any in-progress work.

## Source Of Truth Rule
- A dirty local root worktree is not a delivery baseline.
- Use `origin/master` plus a clean worktree for all phase, cleanup, and release branches.
- Keep the dirty root only as a reference surface until each bucket is isolated or archived.

## Step 1: Baseline Snapshot
```bash
git status --short > cleanup-status-before.txt
```

## Step 2: Group Changes
- **Phase/Governance path**: keep in phase branches (`src/lib`, phase docs, trackers).
- **Product/runtime path**: move to dedicated feature branches (pages/components/migrations).
- **Experimental/unknown**: stash with labels until triage.

## Step 3: Preserve Safely
```bash
git stash push -u -m "cleanup: product-runtime batch"
git stash push -u -m "cleanup: experimental batch"
```

## Step 4: Re-apply by Scope
```bash
git checkout -b feature/<scope> origin/master
git stash pop stash^{/cleanup: product-runtime batch}
```

## Step 5: Enforce Per-PR Scope
- One PR should contain one primary scope.
- Avoid mixing phase governance files with unrelated app changes.

## Step 6: Verification Checklist
- `git diff --name-only origin/master...HEAD` is scope-consistent.
- Required checks (`phase:check:tsconfig`, `test:phase:gate:ci`) pass.
- PR description states what was intentionally excluded.
