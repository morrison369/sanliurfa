import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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
import { appendChangelogEntry, buildChangelogLine, classifyCommit, parseArgs } from '../../../scripts/phase-changelog';

const sampleBlock: PhaseBlockConfig = {
  start: 509,
  end: 514,
  version: 28,
  docFile: 'PHASE_509_514_GOVERNANCE_ASSURANCE_RECOVERY_STABILITY_V28.md',
  testFile: 'src/lib/__tests__/governance-assurance-recovery-suite-v28.test.ts',
  title: 'Governance Assurance Recovery & Stability V28',
  modules: [
    {
      phase: 509,
      title: 'Governance Assurance Recovery Router V28',
      fileName: 'governance-assurance-recovery-router-v28.ts',
      exportBase: 'GovernanceAssuranceRecovery',
      reportLabel: 'Governance assurance recovery',
      reportMessage: 'Governance assurance recovery routed',
      mode: 'router',
      signalFields: ['governanceAssurance', 'recoveryCoverage', 'routerCost'],
      routeLabels: ['recovery-priority', 'recovery-balanced', 'recovery-review']
    },
    {
      phase: 510,
      title: 'Policy Continuity Assurance Harmonizer V28',
      fileName: 'policy-continuity-assurance-harmonizer-v28.ts',
      exportBase: 'PolicyContinuityAssurance',
      reportLabel: 'Policy continuity assurance',
      reportMessage: 'Policy continuity assurance harmonized',
      mode: 'harmonizer',
      signalFields: ['policyContinuity', 'assuranceDepth', 'harmonizerCost']
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
    expect(buildPhaseScriptEntry(509, 514, sampleBlock.testFile)).toContain('test:phase:509-514');
  });

  it('renders phase index entry', () => {
    expect(buildPhaseIndexEntry(sampleBlock.docFile)).toBe('- `PHASE_509_514_GOVERNANCE_ASSURANCE_RECOVERY_STABILITY_V28.md`');
  });

  it('renders module export block', () => {
    const block = buildModuleExportBlock(sampleBlock.modules[0], sampleBlock.version);
    expect(block).toContain("from './governance-assurance-recovery-router-v28'");
  });

  it('renders phase doc', () => {
    const doc = buildPhaseDoc(sampleBlock);
    expect(doc).toContain('# Phase 509-514');
  });

  it('renders router module source', () => {
    const source = buildPhaseModuleSource(sampleBlock.modules[0], sampleBlock.version);
    expect(source).toContain('class GovernanceAssuranceRecoveryRouterV28');
    expect(source).toContain('recovery-balanced');
  });

  it('renders test suite imports and describes', () => {
    const suite = buildPhaseTestSuite(sampleBlock);
    expect(suite).toContain("from '../governance-assurance-recovery-router-v28'");
    expect(suite).toContain("describe('Phase 509: Governance Assurance Recovery Router V28'");
  });

  it('writes generated files to disk', () => {
    const dir = mkdtempSync(join(tmpdir(), 'phase-generator-'));
    try {
      const generated = writeGeneratedPhaseFiles(dir, sampleBlock);
      const doc = readFileSync(join(dir, sampleBlock.docFile), 'utf8');
      const testFile = readFileSync(join(dir, sampleBlock.testFile), 'utf8');
      const moduleFile = readFileSync(join(dir, 'src/lib', sampleBlock.modules[0].fileName), 'utf8');

      expect(generated.exports).toContain('GovernanceAssuranceRecoveryBookV28');
      expect(doc).toContain('# Phase 509-514');
      expect(testFile).toContain('governanceAssuranceRecoveryBookV28');
      expect(moduleFile).toContain('Governance assurance recovery');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('builds generated file bundle', () => {
    const generated = buildGeneratedPhaseFiles(sampleBlock);
    expect(Object.keys(generated.modules)).toHaveLength(2);
    expect(generated.doc).toContain('Governance Assurance Recovery & Stability V28');
  });
});

describe('phase status sync helpers', () => {
  it('renders closed task block', () => {
    expect(
      buildClosedTaskBlock(
        'T-058',
        '503-508',
        'src/lib/__tests__/governance-continuity-recovery-suite-v27.test.ts',
        'PHASE_503_508_GOVERNANCE_CONTINUITY_RECOVERY_ASSURANCE_V27.md'
      )
    ).toContain('T-058');
  });

  it('normalizes duplicate open headers', () => {
    const tracker = ['## Open', '- `T-058` Phase 503-508 planning — closed', '', '## Open', '- `T-059` Phase 509-514 planning'].join('\n');
    const updated = normalizeTrackerOpenHeaders(tracker);
    expect(updated.match(/## Open/g)?.length).toBe(1);
  });

  it('replaces open task with closed task and next open task', () => {
    const tracker = [
      '## Open',
      '- `T-058` Phase 503-508 planning',
      '  - Scope: define architecture, contracts, and acceptance gates for next 6-phase block.',
      '  - Owner: engineering',
      '  - Status: ready'
    ].join('\n');

    const updated = replaceOpenTask(
      tracker,
      'T-058',
      '503-508',
      'T-059',
      '509-514',
      'src/lib/__tests__/governance-continuity-recovery-suite-v27.test.ts',
      'PHASE_503_508_GOVERNANCE_CONTINUITY_RECOVERY_ASSURANCE_V27.md'
    );

    expect(updated).toContain('T-059');
    expect(updated).toContain('closed');
    expect(updated.match(/## Open/g)?.length).toBe(1);
  });

  it('replaces next phase scope block', () => {
    const memory = [
      '## Next 6 Phases (Planned Scope)',
      '- `Phase 503`: Old',
      '',
      '## Checkpoint Rule'
    ].join('\n');

    const updated = replaceNextPhaseScope(memory, [
      { phase: 509, title: 'Governance Assurance Recovery Router V28' },
      { phase: 510, title: 'Policy Continuity Assurance Harmonizer V28' }
    ]);

    expect(updated).toContain('Phase 509');
    expect(updated).not.toContain('Old');
  });

  it('appends completed phase before open tasks', () => {
    const memory = [
      '## Completed Phases',
      '- `Phase 503-508 Governance Continuity Recovery & Assurance V27`: complete',
      '',
      '## Open Tasks'
    ].join('\n');

    const updated = appendCompletedPhase(memory, 'Phase 509-514 Governance Assurance Recovery & Stability V28');
    expect(updated).toContain('Phase 509-514 Governance Assurance Recovery & Stability V28');
  });

  it('replaces optional kickoff line', () => {
    const memory = '- Optional: Phase 503-508 scope definition and kickoff.';
    expect(replaceOptionalKickoff(memory, 'Phase 509-514 scope definition and kickoff')).toContain('Phase 509-514');
  });

  it('formats checkpoint line consistently', () => {
    expect(formatCheckpointLine('Checkpoint 503-508: V27 block delivered')).toBe('- `Checkpoint 503-508`: V27 block delivered');
  });

  it('appends checkpoint before blockers', () => {
    const memory = [
      '## Checkpoint Notes',
      '- `Checkpoint 503-508`: done',
      '',
      '## Blockers'
    ].join('\n');

    const updated = appendCheckpoint(memory, 'Checkpoint 509-514: V28 block delivered with assurance/recovery contract pattern and changelog automation wired.');
    expect(updated).toContain('Checkpoint 509-514');
  });

  it('syncs memory in one pass', () => {
    const memory = [
      '## Completed Phases',
      '- `Phase 503-508 Governance Continuity Recovery & Assurance V27`: complete',
      '',
      '## Open Tasks',
      '- Optional: Phase 503-508 scope definition and kickoff.',
      '',
      '## Next 6 Phases (Planned Scope)',
      '- `Phase 503`: Old',
      '',
      '## Checkpoint Rule',
      '## Checkpoint Notes',
      '- `Checkpoint 503-508`: done',
      '',
      '## Blockers'
    ].join('\n');

    const updated = syncMemory(memory, {
      completedTitle: 'Phase 509-514 Governance Assurance Recovery & Stability V28',
      optionalKickoff: 'Phase 515-520 scope definition and kickoff',
      nextScopes: [
        { phase: 515, title: 'Governance Continuity Assurance Router V29' },
        { phase: 516, title: 'Policy Recovery Continuity Harmonizer V29' }
      ],
      checkpoint: 'Checkpoint 509-514: V28 block delivered with assurance/recovery contract pattern and changelog automation wired.'
    });

    expect(updated).toContain('Phase 509-514 Governance Assurance Recovery & Stability V28');
    expect(updated).toContain('Phase 515');
    expect(updated).toContain('Checkpoint 509-514');
  });
});

describe('worktree bootstrap helpers', () => {
  it('builds bootstrap steps with install', () => {
    const steps = buildWorktreeBootstrapSteps({
      rootDir: 'D:/repo',
      worktreePath: 'D:/repo-next',
      branchName: 'batch-phase-509',
      baseRef: 'origin/master',
      installDependencies: true
    });

    expect(steps).toEqual([
      { command: 'git', args: ['fetch', 'origin'], cwd: 'D:/repo' },
      { command: 'git', args: ['worktree', 'add', 'D:/repo-next', '-b', 'batch-phase-509', 'origin/master'], cwd: 'D:/repo' },
      { command: 'git', args: ['pull', '--ff-only', 'origin', 'master'], cwd: 'D:/repo-next' },
      { command: 'npm', args: ['ci'], cwd: 'D:/repo-next' }
    ]);
  });

  it('parses bootstrap args with skip install', () => {
    const parsed = parseBootstrapArgs(['../repo-next', 'batch-phase-509', 'origin/master', '--skip-install']);
    expect(parsed.branchName).toBe('batch-phase-509');
    expect(parsed.baseRef).toBe('origin/master');
    expect(parsed.installDependencies).toBe(false);
  });
});

describe('phase changelog helpers', () => {
  it('classifies phase and chore commits', () => {
    expect(classifyCommit('Phase 509-514: Governance Assurance Recovery Stability V28')).toBe('phase');
    expect(classifyCommit('Chore: append phase changelog entry for 509-514')).toBe('chore');
    expect(classifyCommit('Fix: unrelated')).toBe(null);
  });

  it('builds changelog lines', () => {
    expect(buildChangelogLine('2026-04-09', 'phase', 'abc1234', 'Phase 509-514: Governance Assurance Recovery Stability V28')).toBe(
      '- 2026-04-09 | phase | `abc1234` | Phase 509-514: Governance Assurance Recovery Stability V28'
    );
  });

  it('appends unique changelog entries once', () => {
    const initial = '# Phase Changelog\n\n';
    const line = '- 2026-04-09 | phase | `abc1234` | Phase 509-514: Governance Assurance Recovery Stability V28';
    const once = appendChangelogEntry(initial, line);
    const twice = appendChangelogEntry(once, line);
    expect(once).toContain(line);
    expect(twice).toBe(once);
  });

  it('parses ref and out args', () => {
    const cwd = process.cwd();
    const parsed = parseArgs(['--ref', 'HEAD~1', '--out', 'tmp/PHASE_CHANGELOG.md']);
    expect(parsed.ref).toBe('HEAD~1');
    expect(parsed.outPath).toBe(join(cwd, 'tmp/PHASE_CHANGELOG.md'));
  });
});
