# Repository Guidelines

## Project Structure & Module Organization
- `src/pages/`: Astro SSR routes and `src/pages/api/` handlers.
- `src/components/`, `src/layouts/`, `src/styles/`: UI and layout code.
- `src/lib/`: shared logic plus phase libraries; tests live in `src/lib/__tests__/`.
- `src/content/` with `src/content.config.ts`: content collections; loader and schema edits must ship together.
- `public/`: static assets and PWA files.
- Root phase records: `PHASE_*.md`, `PHASE_INDEX.md`, `TASK_TRACKER.md`, `memory.md`, `PHASE_CHANGELOG.md`.

## Build, Test, and Development Commands
- `npm run dev`: local Astro server.
- `npm run build`: SSR production build to `dist/`.
- `npm run lint`: `astro check` plus `tsc --noEmit`.
- `npm run test:unit`: full Vitest run.
- `npm run test:phase:785-790`: run one phase suite.
- `npm run phase:generate:block:write -- scripts/phase-blocks/phase-803-808.json`: reliable write path for generator output on Windows/npm wrapper setups.
- `npm run phase:prepare:block -- --phase-script test:phase:785-790`: serialized phase gate for one block.
- `npm run phase:prepare:batch -- --phase-script test:phase:785-790 --phase-script test:phase:791-796`: serialized batch gate for multiple blocks.
- `npm run test:phase:gate:ci`: locked smoke/build gate for CI parity.

## Coding Style & Naming Conventions
- TypeScript + Astro, 2-space indentation, Prettier-compatible output.
- Use `kebab-case` filenames in `src/lib/`; exports stay `PascalCase`.
- Keep phase modules pure unless the contract explicitly needs infra imports.
- Tests use `*.test.ts` and live beside other governance suites in `src/lib/__tests__/`.

## Astro Rules
- This repo is SSR-first: `output: "server"` with `@astrojs/node`.
- Do not create route collisions such as `src/pages/x.ts` and `src/pages/x/index.ts`.
- `sw.js` is the emitted PWA worker; keep build exclusions aligned to that filename.
- Never run parallel Astro build or gate chains in the same worktree.

## Testing Guidelines
- Each phase block ships with 6 libs and 24 Vitest assertions.
- Run the block suite first, then the locked phase wrapper, then PR checks.
- When changing phase automation, extend `src/lib/__tests__/phase-automation-scripts.test.ts`.

## Commit & Pull Request Guidelines
- Use milestone commits: `Phase 785-790: ...`.
- Phase deliveries keep two commits by design:
- `Phase <range>: ...`
- `Chore: update phase changelog for <range>`
- Open PRs through the API-safe wrappers (`phase:pr:open:file`, `phase:pr:view`) and verify merge from remote state, not local fast-forward output.

## Environment & Ops Notes
- Use Node `22.13.0` or newer 22.x; `.nvmrc` is the repo source of truth.
- Keep `npm` cache repo-local through `.npmrc`.
- Do phase delivery work in clean `git worktree` branches, not in the dirty root worktree.
- If the active shell is below policy, use the `:preferred` wrappers instead of forcing a partial local run.
