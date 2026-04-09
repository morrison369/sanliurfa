# Repo Stabilization Runbook

## Scope
This runbook prevents unstable mixed worktrees and accidental API breakage.

## Rules
1. Always branch from clean `origin/master` worktree.
2. Keep changes split by domain:
   - `api-legacy/*`
   - `governance/*`
   - `runtime-security/*`
   - `e2e-ci/*`
3. Never bundle large unrelated file sets into one commit.
4. No direct work on dirty root worktree.

## Mandatory Commands
```bash
npm run repo:stabilize:check
npm run release:gate
```

## Blocking Conditions
- Deleted files under `src/pages/api/**` without explicit migration.
- Missing deprecation policy for moved endpoints.
- Release gate failures.
