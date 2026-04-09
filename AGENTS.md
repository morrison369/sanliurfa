# Repository Guidelines

## Project Structure & Module Organization
- `src/pages/`: Astro SSR routes and `src/pages/api/` handlers.
- `src/components/`, `src/layouts/`, `src/styles/`: UI composition.
- `src/lib/`: shared logic and phase libraries; tests live in `src/lib/__tests__/`.
- `src/content/`: content collections; keep loader and schema changes aligned.
- `public/`: static assets, manifest, PWA files.
- `scripts/`: phase automation, migration, deploy, and repo ops utilities.
- Root docs: `PHASE_*.md`, `PHASE_INDEX.md`, `TASK_TRACKER.md`, `memory.md`.

## Build, Test, and Development Commands
- `npm run dev`: Astro dev server.
- `npm run build`: SSR production build to `dist/`.
- `npm run lint`: `astro check` plus TypeScript no-emit.
- `npm run test:unit`: Vitest suite.
- `npm run test:phase:smoke`: previous + latest phase suites.
- `npm run test:phase:gate:ci`: phase tsconfig check, phase lint, smoke, Astro build.
- `npm run phase:prepare:block -- --phase-script test:phase:<range>`: serialized phase gate wrapper; use this instead of manually chaining sync/check/smoke/build.
- `npm run phase:prepare:block:preferred -- --phase-script test:phase:<range>`: runs the same pipeline through the preferred Node 22.x executable when the active shell version is behind.
- `npm run phase:checks:wait -- <pr>`: waits for CI checks to publish, then watches them.
- `npm run phase:pr:open:file -- <repo> <base> <head> <title-file> <body-file>`: npm-safe PR open wrapper when long flag forwarding is unreliable on Windows.
- `npm run phase:pr:view -- <repo> <pr-number>`: npm-safe PR merge-status wrapper for Windows positional arg forwarding.
- `npm run phase:sync:tsconfig`: refresh `tsconfig.phase.json` after phase file changes.

## Coding Style & Naming Conventions
- TypeScript and Astro, 2-space indentation, Prettier-compatible output.
- Use `kebab-case` for files in `src/lib/` and `PascalCase` exports.
- Keep phase modules pure where possible; avoid direct infra imports unless the contract requires them.
- Tests stay in `src/lib/__tests__/` and use `*.test.ts` naming.

## Astro Rules
- This repo is SSR-first: `output: 'server'` with `@astrojs/node` standalone adapter.
- Do not create route collisions like `src/pages/x.ts` and `src/pages/x/index.ts` together.
- Treat `src/content.config.ts` as coupled to `src/content/`; loader/schema updates must ship together.
- PWA output currently builds `sw.js`; keep compression exclusions aligned to the emitted file name.

## Testing Guidelines
- Each phase block delivers 6 libs and 24 Vitest assertions.
- Run the block-specific suite first, then `npm run phase:prepare:block -- --phase-script test:phase:<range>` before PR.
- For repo ops changes, extend `src/lib/__tests__/phase-automation-scripts.test.ts` when touching automation scripts.

## Commit & Pull Request Guidelines
- Use milestone-style commits: `Phase 671-676: ...` or `Chore: ...`.
- Phase deliveries keep two commits on purpose:
  - `Phase <range>: ...`
  - `Chore: update phase changelog for <range>`
- Prefer API-first PR creation for phase branches: `tsx scripts/phase-pr.ts open ...`.
- Verify merge completion from remote state, not local fast-forward behavior: `tsx scripts/phase-pr.ts view --repo titanai777/sanliurfa --pr <n>`.
- PR body should list scope, verification commands, and any intentionally deferred warnings.

## Environment & Ops Notes
- Use Node `22.13.0` or newer 22.x for local work and CI parity.
- Keep `npm` cache repo-local via `.npmrc`; do not rely on another project’s cache path.
- Use clean `git worktree` branches for deliveries; do not develop phase blocks in the dirty root worktree.
