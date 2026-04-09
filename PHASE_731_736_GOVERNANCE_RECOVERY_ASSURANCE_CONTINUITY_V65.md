# Phase 731-736: Governance Recovery Assurance & Continuity V65

## Scope
- Phase 731: Governance Recovery Assurance Router V65
- Phase 732: Policy Continuity Stability Harmonizer V65
- Phase 733: Compliance Assurance Recovery Mesh V65
- Phase 734: Trust Stability Continuity Forecaster V65
- Phase 735: Board Recovery Stability Coordinator V65
- Phase 736: Policy Assurance Continuity Engine V65

## Deliverables
- 6 library modules under `src/lib/`
- 24 Vitest assertions in `src/lib/__tests__/governance-recovery-assurance-suite-v65.test.ts`
- export surface updates in `src/lib/index.ts`
- tracker updates in `PHASE_INDEX.md`, `TASK_TRACKER.md`, and `memory.md`

## Verification
- `npm run phase:sync:tsconfig`
- `npm run phase:check:tsconfig`
- `npm run test:phase:731-736`
- `npm run test:phase:smoke`
- `npm run test:phase:gate:ci`

## Notes
- V65 advances the same governance-kit contract surface to keep scorer, router, gate, and report compatibility stable.
- `test:phase:latest` advances to the V65 suite through the existing phase runner automation.
