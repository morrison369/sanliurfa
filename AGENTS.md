# Repository Guidelines

## Project Structure & Module Organization
Core app code is under `src/`.
- `src/pages/`: Astro routes and API handlers (including `src/pages/api/`).
- `src/components/`, `src/layouts/`, `src/styles/`: UI composition and styling.
- `src/lib/`: domain logic, governance libraries, shared utilities.
- `src/lib/__tests__/`: phase-focused Vitest suites.
- `public/`: static files and PWA assets.
- `scripts/`: operational utilities (migrate, checks, deploy).

Phase delivery artifacts are tracked at repo root:
- `PHASE_*.md`, `PHASE_INDEX.md`, `memory.md`, `TASK_TRACKER.md`.

## Build, Test, and Development Commands
- `npm run dev`: run Astro dev server.
- `npm run build`: production build to `dist/`.
- `npm run preview`: preview built output.
- `npm run lint`: `astro check` + TypeScript no-emit.
- `npm run test:unit`: run all unit tests.
- `npm run test:phase:311-316`: run current phase regression quickly.
- `npm run test:e2e`: run Playwright tests.

Recommended local gate for phase work:
`npm run test:unit -- <phase-test-file> && npm run build`

## Coding Style & Naming Conventions
- TypeScript + Astro strict mode.
- 2-space indentation; keep formatting Prettier-compatible.
- Prefer descriptive `kebab-case` for `src/lib` modules.
- Keep phase modules small and composable (store/scorer/gate/reporter pattern).
- Test files use `*.test.ts` and live in `src/lib/__tests__/`.

## Testing Guidelines
- Each phase block ships with 24 unit tests (6 modules x 4 tests).
- Test categories per module: store/add, compute/score, gate/route, report.
- For changed phase blocks, run only relevant suite first, then full build.

## Commit & Pull Request Guidelines
- Use milestone-style commit titles: `Phase 311-316: <short title>`.
- One logical delivery per commit (code + tests + docs + trackers).
- PR must include:
  - affected phase range,
  - commands executed,
  - test/build results,
  - any known warnings not addressed.

## Phase Workflow (Required)
For every new phase range:
1. Add 6 `src/lib` modules.
2. Add one 24-test suite in `src/lib/__tests__/`.
3. Export modules from `src/lib/index.ts`.
4. Add `PHASE_<range>_*.md` and register in `PHASE_INDEX.md`.
5. Update `memory.md` and `TASK_TRACKER.md`.
6. Keep `tsconfig.phase.json` scoped (`include: []` + explicit phase `files` list).
7. Prefer pure phase modules; avoid direct infra imports (`logger`, `postgres`) unless phase contract requires them.
8. Verify with `npm run test:phase:gate:ci` before handoff.
