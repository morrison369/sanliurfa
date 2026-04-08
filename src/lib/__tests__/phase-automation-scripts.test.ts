import { describe, it, expect } from 'vitest';
import { getPhaseScriptOrder, selectPhaseScript } from '../../../scripts/phase-runner';
import { buildExpectedFiles } from '../../../scripts/update-phase-tsconfig';
import { buildPhaseDoc, buildPhaseIndexEntry, buildPhaseScriptEntry, buildModuleExportBlock } from '../../../scripts/phase-block-generator';
import { buildClosedTaskBlock, replaceNextPhaseScope, replaceOpenTask } from '../../../scripts/phase-status-sync';

describe('phase-runner automation', () => {
  it('orders phase scripts by start range', () => {
    const scripts = {
      'test:phase:419-424': 'vitest run a',
      'test:phase:401-406': 'vitest run b',
      'test:phase:413-418': 'vitest run c'
    };

    expect(getPhaseScriptOrder(scripts)).toEqual([
      'test:phase:401-406',
      'test:phase:413-418',
      'test:phase:419-424'
    ]);
  });

  it('ignores non-range phase script keys', () => {
    const scripts = {
      'test:phase:latest': 'tsx scripts/phase-runner.ts latest',
      'test:phase:prev': 'tsx scripts/phase-runner.ts prev',
      'test:phase:419-424': 'vitest run a',
      'test:phase:425-430': 'vitest run b'
    };

    expect(getPhaseScriptOrder(scripts)).toEqual([
      'test:phase:419-424',
      'test:phase:425-430'
    ]);
  });

  it('selects latest phase script', () => {
    const scripts = {
      'test:phase:413-418': 'vitest run c',
      'test:phase:419-424': 'vitest run a'
    };

    expect(selectPhaseScript('latest', scripts)).toBe('test:phase:419-424');
  });

  it('selects previous phase script', () => {
    const scripts = {
      'test:phase:401-406': 'vitest run b',
      'test:phase:413-418': 'vitest run c',
      'test:phase:419-424': 'vitest run a'
    };

    expect(selectPhaseScript('prev', scripts)).toBe('test:phase:413-418');
  });

  it('throws on prev when single phase exists', () => {
    const scripts = {
      'test:phase:419-424': 'vitest run a'
    };

    expect(() => selectPhaseScript('prev', scripts)).toThrow(/No previous phase script found/);
  });
});

describe('tsconfig phase automation', () => {
  it('keeps fixed entries and replaces versioned entries', () => {
    const root = process.cwd();
    const current = [
      'src/lib/governance-kit.ts',
      'src/lib/policy-recovery-stability-engine-v10.ts',
      'src/lib/policy-assurance-recovery-engine-v12.ts'
    ];
    const versioned = [
      'src/lib/policy-assurance-recovery-engine-v12.ts',
      'src/lib/policy-continuity-stability-engine-v13.ts'
    ];

    expect(buildExpectedFiles(root, current, versioned)).toContain('src/lib/governance-kit.ts');
  });
});

describe('phase block generator helpers', () => {
  it('renders phase script entry', () => {
    expect(buildPhaseScriptEntry(485, 490, 'src/lib/__tests__/governance-assurance-recovery-suite-v24.test.ts')).toContain('test:phase:485-490');
  });

  it('renders phase index entry', () => {
    expect(buildPhaseIndexEntry('PHASE_485_490_GOVERNANCE_ASSURANCE_RECOVERY_CONTINUITY_V24.md')).toBe(
      '- `PHASE_485_490_GOVERNANCE_ASSURANCE_RECOVERY_CONTINUITY_V24.md`'
    );
  });

  it('renders module export block', () => {
    const block = buildModuleExportBlock({
      phase: 485,
      title: 'Governance Assurance Stability Router V24',
      fileName: 'governance-assurance-stability-router-v24.ts',
      exportBase: 'GovernanceAssuranceStability',
      reportLabel: 'Governance assurance stability',
      reportMessage: 'Governance assurance stability routed',
      mode: 'router',
      signalFields: ['governanceAssurance', 'stabilityCoverage', 'routerCost'],
      routeLabels: ['stability-priority', 'stability-balanced', 'stability-review']
    });

    expect(block).toContain("from './governance-assurance-stability-router-v24'");
  });

  it('renders phase doc', () => {
    const doc = buildPhaseDoc({
      start: 485,
      end: 490,
      version: 24,
      docFile: 'PHASE_485_490_GOVERNANCE_ASSURANCE_RECOVERY_CONTINUITY_V24.md',
      testFile: 'src/lib/__tests__/governance-assurance-recovery-suite-v24.test.ts',
      title: 'Governance Assurance Recovery & Continuity V24',
      modules: [
        {
          phase: 485,
          title: 'Governance Assurance Stability Router V24',
          fileName: 'governance-assurance-stability-router-v24.ts',
          exportBase: 'GovernanceAssuranceStability',
          reportLabel: 'Governance assurance stability',
          reportMessage: 'Governance assurance stability routed',
          mode: 'router',
          signalFields: ['governanceAssurance', 'stabilityCoverage', 'routerCost'],
          routeLabels: ['stability-priority', 'stability-balanced', 'stability-review']
        }
      ]
    });

    expect(doc).toContain('# Phase 485-490');
  });
});

describe('phase status sync helpers', () => {
  it('renders closed task block', () => {
    expect(
      buildClosedTaskBlock(
        'T-055',
        '485-490',
        'src/lib/__tests__/governance-assurance-recovery-suite-v24.test.ts',
        'PHASE_485_490_GOVERNANCE_ASSURANCE_RECOVERY_CONTINUITY_V24.md'
      )
    ).toContain('T-055');
  });

  it('replaces open task with closed task and next open task', () => {
    const tracker = [
      '## Open',
      '- `T-055` Phase 485-490 planning',
      '  - Scope: define architecture, contracts, and acceptance gates for next 6-phase block.',
      '  - Owner: engineering',
      '  - Status: ready'
    ].join('\n');

    const updated = replaceOpenTask(
      tracker,
      'T-055',
      '485-490',
      'T-056',
      '491-496',
      'src/lib/__tests__/governance-assurance-recovery-suite-v24.test.ts',
      'PHASE_485_490_GOVERNANCE_ASSURANCE_RECOVERY_CONTINUITY_V24.md'
    );

    expect(updated).toContain('T-056');
    expect(updated).toContain('closed');
  });

  it('replaces next phase scope block', () => {
    const memory = [
      '## Next 6 Phases (Planned Scope)',
      '- `Phase 485`: Old',
      '',
      '## Checkpoint Rule'
    ].join('\n');

    const updated = replaceNextPhaseScope(memory, [
      { phase: 491, title: 'Governance Stability Assurance Router V25' },
      { phase: 492, title: 'Policy Continuity Stability Harmonizer V25' }
    ]);

    expect(updated).toContain('Phase 491');
    expect(updated).not.toContain('Old');
  });
});
