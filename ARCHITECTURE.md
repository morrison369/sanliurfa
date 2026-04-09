# Architecture

This repository is an Astro SSR application with a separate phase-delivery operations layer. Treat them as two systems that share one repo.

## Delivery Model
- Authoritative delivery surface: clean `git worktree` from `origin/master`
- Non-authoritative local surface: dirty root worktree, inventory only
- Operational policy references:
  - `STALE_WORKTREE.md`
  - `ROOT_INVENTORY_ONLY_POLICY.md`
  - `docs/WORKTREE_SOURCE_OF_TRUTH.md`

## Application Runtime
- Framework: Astro SSR
- Output mode: `server`
- Adapter: `@astrojs/node`
- UI islands: React where needed, Astro pages/layouts for route delivery
- Shared logic: `src/lib/`
- Content collections: `src/content/` + `src/content.config.ts`

## Astro Invariants
- Do not create route collisions like `src/pages/x.ts` and `src/pages/x/index.ts`.
- Do not run parallel Astro build or phase-gate chains in the same worktree.
- Do not convert scripts using `import.meta.env` into `is:inline`; that bypasses Astro/Vite transforms.
- Treat `sw.js` as the emitted PWA worker artifact when adjusting compression or exclusion rules.
- Pair content collection loader and schema changes; `src/content/` and `src/content.config.ts` move together.

## Operational Runtime
- Phase delivery is runner-first:
  - `test:phase:range`
  - `test:phase:batch`
  - `phase:prepare:block:preferred`
  - `phase:prepare:batch:preferred`
  - `phase:doctor`
- `test:phase:<range>` entries are compatibility surface for generated blocks, not the preferred operator API.

## State Files
- Active metadata:
  - `PHASE_INDEX.md`
  - `TASK_TRACKER.md`
  - `memory.md`
  - `PHASE_CHANGELOG.md`
- `PHASE_CHANGELOG.md` records phase rows only. Changelog maintenance chores do not belong in the changelog.

## Dependency Policy
- Dependency upgrades do not ship inside routine phase-delivery PRs.
- Use `npm run deps:audit:triage` and `docs/DEPENDENCY_TRIAGE.md` to classify risk before any dependency PR.
- Runtime dependency fixes come before dev-only tooling fixes.

## Build And Gate Boundary
- Build/gate correctness is validated through:
  - `npm run phase:doctor`
  - `npm run test:phase:gate:ci`
  - `npm run build`
- CI required checks stay minimal and deterministic:
  - `phase:check:tsconfig`
  - `test:phase:gate:ci`
- Advisory checks may expand, but required checks should remain stable unless there is a clear failure mode they need to cover.
