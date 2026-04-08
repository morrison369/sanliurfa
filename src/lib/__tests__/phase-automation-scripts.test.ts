import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';
import { getPhaseScriptOrder, selectPhaseScript } from '../../../scripts/phase-runner';
import { buildExpectedFiles } from '../../../scripts/update-phase-tsconfig';
import {
  buildGeneratedPhaseFiles,
  buildModuleExportBlock,
  buildPhaseDoc,
  buildPhaseIndexEntry,
  buildPhaseModuleSource,
  buildPhaseScriptEntry,
  buildPhaseTestSuite,
  writeGeneratedPhaseFiles,
  type PhaseBlockConfig
} from '../../../scripts/phase-block-generator';
import {
  appendCheckpoint,
  appendCompletedPhase,
  buildClosedTaskBlock,
  formatCheckpointLine,
  normalizeTrackerOpenHeaders,
  replaceNextPhaseScope,
  replaceOpenTask,
  replaceOptionalKickoff,
  syncMemory
} from '../../../scripts/phase-status-sync';
import { buildWorktreeBootstrapSteps, parseBootstrapArgs } from '../../../scripts/phase-worktree-bootstrap';

const sampleBlock: PhaseBlockConfig = {
  start: 503,
  end: 508,
  version: 27,
  docFile: 'PHASE_503_508_GOVERNANCE_CONTINUITY_RECOVERY_ASSURANCE_V27.md',
  testFile: 'src/lib/__tests__/governance-continuity-recovery-suite-v27.test.ts',
  title: 'Governance Continuity Recovery & Assurance V27',
  modules: [
    {
      phase: 503,
      title: 'Governance Continuity Recovery Router V27',
      fileName: 'governance-continuity-recovery-router-v27.ts',
      exportBase: 'GovernanceContinuityRecovery',
      reportLabel: 'Governance continuity recovery',
      reportMessage: 'Governance continuity recovery routed',
      mode: 'router',
      signalFields: ['governanceContinuity', 'recoveryCoverage', 'routerCost'],
      routeLabels: ['recovery-priority', 'recovery-balanced', 'recovery-review']
    },
    {
      phase: 504,
      title: 'Policy Assurance Stability Harmonizer V27',
      fileName: 'policy-assurance-stability-harmonizer-v27.ts',
      exportBase: 'PolicyAssuranceStability',
      reportLabel: 'Policy assurance stability',
      reportMessage: 'Policy assurance stability harmonized',
      mode: 'harmonizer',
      signalFields: ['policyAssurance', 'stabilityDepth', 'harmonizerCost']
    }
  ]
};

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
    expect(buildPhaseScriptEntry(503, 508, sampleBlock.testFile)).toContain('test:phase:503-508');
  });

  it('renders phase index entry', () => {
    expect(buildPhaseIndexEntry(sampleBlock.docFile)).toBe('- `PHASE_503_508_GOVERNANCE_CONTINUITY_RECOVERY_ASSURANCE_V27.md`');
  });

  it('renders module export block', () => {
    const block = buildModuleExportBlock(sampleBlock.modules[0], sampleBlock.version);
    expect(block).toContain("from './governance-continuity-recovery-router-v27'");
  });

  it('renders phase doc', () => {
    const doc = buildPhaseDoc(sampleBlock);
    expect(doc).toContain('# Phase 503-508');
  });

  it('renders router module source', () => {
    const source = buildPhaseModuleSource(sampleBlock.modules[0], sampleBlock.version);
    expect(source).toContain('class GovernanceContinuityRecoveryRouterV27');
    expect(source).toContain('recovery-balanced');
  });

  it('renders test suite imports and describes', () => {
    const suite = buildPhaseTestSuite(sampleBlock);
    expect(suite).toContain("from '../governance-continuity-recovery-router-v27'");
    expect(suite).toContain("describe('Phase 503: Governance Continuity Recovery Router V27'");
  });

  it('writes generated files to disk', () => {
    const dir = mkdtempSync(join(tmpdir(), 'phase-generator-'));
    try {
      const generated = writeGeneratedPhaseFiles(dir, sampleBlock);
      const doc = readFileSync(join(dir, sampleBlock.docFile), 'utf8');
      const testFile = readFileSync(join(dir, sampleBlock.testFile), 'utf8');
      const moduleFile = readFileSync(join(dir, 'src/lib', sampleBlock.modules[0].fileName), 'utf8');

      expect(generated.exports).toContain('GovernanceContinuityRecoveryBookV27');
      expect(doc).toContain('# Phase 503-508');
      expect(testFile).toContain('governanceContinuityRecoveryBookV27');
      expect(moduleFile).toContain('Governance continuity recovery');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('builds generated file bundle', () => {
    const generated = buildGeneratedPhaseFiles(sampleBlock);
    expect(Object.keys(generated.modules)).toHaveLength(2);
    expect(generated.doc).toContain('Governance Continuity Recovery & Assurance V27');
  });
});

describe('phase status sync helpers', () => {
  it('renders closed task block', () => {
    expect(
      buildClosedTaskBlock(
        'T-057',
        '497-502',
        'src/lib/__tests__/governance-recovery-assurance-suite-v26.test.ts',
        'PHASE_497_502_GOVERNANCE_RECOVERY_ASSURANCE_CONTINUITY_V26.md'
      )
    ).toContain('T-057');
  });

  it('normalizes duplicate open headers', () => {
    const tracker = ['## Open', '- `T-057` Phase 497-502 planning — closed', '', '## Open', '- `T-058` Phase 503-508 planning'].join('\n');
    const updated = normalizeTrackerOpenHeaders(tracker);
    expect(updated.match(/## Open/g)?.length).toBe(1);
  });

  it('replaces open task with closed task and next open task', () => {
    const tracker = [
      '## Open',
      '- `T-057` Phase 497-502 planning',
      '  - Scope: define architecture, contracts, and acceptance gates for next 6-phase block.',
      '  - Owner: engineering',
      '  - Status: ready'
    ].join('\n');

    const updated = replaceOpenTask(
      tracker,
      'T-057',
      '497-502',
      'T-058',
      '503-508',
      'src/lib/__tests__/governance-recovery-assurance-suite-v26.test.ts',
      'PHASE_497_502_GOVERNANCE_RECOVERY_ASSURANCE_CONTINUITY_V26.md'
    );

    expect(updated).toContain('T-058');
    expect(updated).toContain('closed');
    expect(updated.match(/## Open/g)?.length).toBe(1);
  });

  it('replaces next phase scope block', () => {
    const memory = [
      '## Next 6 Phases (Planned Scope)',
      '- `Phase 497`: Old',
      '',
      '## Checkpoint Rule'
    ].join('\n');

    const updated = replaceNextPhaseScope(memory, [
      { phase: 503, title: 'Governance Continuity Recovery Router V27' },
      { phase: 504, title: 'Policy Assurance Stability Harmonizer V27' }
    ]);

    expect(updated).toContain('Phase 503');
    expect(updated).not.toContain('Old');
  });

  it('appends completed phase before open tasks', () => {
    const memory = [
      '## Completed Phases',
      '- `Phase 497-502 Governance Recovery Assurance & Continuity V26`: complete',
      '',
      '## Open Tasks'
    ].join('\n');

    const updated = appendCompletedPhase(memory, 'Phase 503-508 Governance Continuity Recovery & Assurance V27');
    expect(updated).toContain('Phase 503-508 Governance Continuity Recovery & Assurance V27');
  });

  it('replaces optional kickoff line', () => {
    const memory = '- Optional: Phase 497-502 scope definition and kickoff.';
    expect(replaceOptionalKickoff(memory, 'Phase 503-508 scope definition and kickoff')).toContain('Phase 503-508');
  });

  it('formats checkpoint line consistently', () => {
    expect(formatCheckpointLine('Checkpoint 497-502: V26 block delivered')).toBe('- `Checkpoint 497-502`: V26 block delivered');
  });

  it('appends checkpoint before blockers', () => {
    const memory = [
      '## Checkpoint Notes',
      '- `Checkpoint 497-502`: done',
      '',
      '## Blockers'
    ].join('\n');

    const updated = appendCheckpoint(memory, 'Checkpoint 503-508: V27 block delivered with continuity/recovery contract pattern and generator-assisted scaffolding.');
    expect(updated).toContain('Checkpoint 503-508');
  });

  it('syncs memory in one pass', () => {
    const memory = [
      '## Completed Phases',
      '- `Phase 497-502 Governance Recovery Assurance & Continuity V26`: complete',
      '',
      '## Open Tasks',
      '- Optional: Phase 497-502 scope definition and kickoff.',
      '',
      '## Next 6 Phases (Planned Scope)',
      '- `Phase 497`: Old',
      '',
      '## Checkpoint Rule',
      '## Checkpoint Notes',
      '- `Checkpoint 497-502`: done',
      '',
      '## Blockers'
    ].join('\n');

    const updated = syncMemory(memory, {
      completedTitle: 'Phase 503-508 Governance Continuity Recovery & Assurance V27',
      optionalKickoff: 'Phase 509-514 scope definition and kickoff',
      nextScopes: [
        { phase: 509, title: 'Governance Assurance Recovery Router V28' },
        { phase: 510, title: 'Policy Continuity Assurance Harmonizer V28' }
      ],
      checkpoint: 'Checkpoint 503-508: V27 block delivered with continuity/recovery contract pattern and generator-assisted scaffolding.'
    });

    expect(updated).toContain('Phase 503-508 Governance Continuity Recovery & Assurance V27');
    expect(updated).toContain('Phase 509');
    expect(updated).toContain('Checkpoint 503-508');
  });
});

describe('worktree bootstrap helpers', () => {
  it('builds bootstrap steps with install', () => {
    const steps = buildWorktreeBootstrapSteps({
      rootDir: 'D:/repo',
      worktreePath: 'D:/repo-next',
      branchName: 'batch-phase-503',
      baseRef: 'origin/master',
      installDependencies: true
    });

    expect(steps).toEqual([
      { command: 'git', args: ['fetch', 'origin'], cwd: 'D:/repo' },
      { command: 'git', args: ['worktree', 'add', 'D:/repo-next', '-b', 'batch-phase-503', 'origin/master'], cwd: 'D:/repo' },
      { command: 'git', args: ['pull', '--ff-only', 'origin', 'master'], cwd: 'D:/repo-next' },
      { command: 'npm', args: ['ci'], cwd: 'D:/repo-next' }
    ]);
  });

  it('parses bootstrap args with skip install', () => {
    const parsed = parseBootstrapArgs(['../repo-next', 'batch-phase-503', 'origin/master', '--skip-install']);
    expect(parsed.branchName).toBe('batch-phase-503');
    expect(parsed.baseRef).toBe('origin/master');
    expect(parsed.installDependencies).toBe(false);
  });
});
