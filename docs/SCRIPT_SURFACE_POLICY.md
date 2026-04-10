# Script Surface Policy

The repository exposes two script layers.

## Runner-First Commands
These are the only commands operators should treat as the primary interface:
- `npm run test:phase:range -- <range>`
- `npm run test:phase:batch -- <range-a> <range-b> <range-c>`
- `npm run phase:prepare:block:preferred -- --phase-script test:phase:<range>`
- `npm run phase:prepare:batch:preferred -- --phase-script test:phase:<range-a> --phase-script test:phase:<range-b>`
- `npm run phase:doctor`
- `npm run phase:changelog:normalize`
- `npm run phase:scripts:report`

## Compatibility Surface
- `test:phase:<range>` entries exist so generated phase blocks remain directly invokable.
- They are compatibility surface, not the preferred operator interface.
- New docs, handoff notes, and runbooks should reference runner-first commands, not individual `test:phase:<range>` commands.
- Stale compatibility entries should be pruned with `npm run phase:compat:prune-stale`.

## Reduction Policy
- Do not add new top-level operator docs that depend on individual `test:phase:<range>` scripts.
- Keep only still-used compatibility entries in the manifest; stale ranges belong in archive docs, not active compatibility surface.
- Review the current script count with `npm run phase:scripts:report`.
- Review and prune stale compatibility entries with `npm run phase:compat:cleanup` and `npm run phase:compat:prune-stale`.
- Active blocking decisions must stay on `quick-gate`, `full-gate`, `test:critical:blocking`, and `test:e2e:smoke`.
- Legacy phase workflow is manual-only; see `docs/ops/LEGACY_PHASE_SURFACE.md`.

## Change Policy
- Script surface changes belong in dedicated ops PRs, not mixed into dependency-only PRs unless the change is needed for validation.
