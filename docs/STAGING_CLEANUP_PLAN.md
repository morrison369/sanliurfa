# Staging Cleanup Plan

## Goal
Keep phase deliveries isolated from legacy/unrelated workspace changes.

## Step 1: Verify current state
- `git status --short`
- `git log --oneline -5`

## Step 2: Stage only target scope
- Phase code:
  - `git add src/lib/<phase-files>.ts src/lib/__tests__/<phase-suite>.test.ts src/lib/index.ts`
- Phase docs and trackers:
  - `git add PHASE_<range>_*.md PHASE_INDEX.md TASK_TRACKER.md memory.md`
- Gate/config:
  - `git add tsconfig.phase.json package.json package-lock.json`

## Step 3: Commit by intent (recommended split)
1. `chore(gate): ...` for lint/config/runtime compatibility
2. `test(phase): ...` for test coverage and contributor guidance
3. `Phase XXX-YYY: ...` for new phase modules + docs

## Step 4: Pre-merge verification
- `npm run test:phase:gate:ci`

## Step 5: If unrelated files remain
- Leave them unstaged.
- Open a separate cleanup branch/PR for non-phase drift.
