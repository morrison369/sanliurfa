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
import { appendChangelogEntry, buildChangelogLine, classifyCommit, parseArgs } from '../../../scripts/phase-changelog';

const sampleBlock: PhaseBlockConfig = {
  start: 515,
  end: 520,
  version: 29,
  docFile: 'PHASE_515_520_GOVERNANCE_CONTINUITY_ASSURANCE_RECOVERY_V29.md',
  testFile: 'src/lib/__tests__/governance-continuity-assurance-suite-v29.test.ts',
  title: 'Governance Continuity Assurance & Recovery V29',
  modules: [
    {
      phase: 515,
      title: 'Governance Continuity Assurance Router V29',
      fileName: 'governance-continuity-assurance-router-v29.ts',
      exportBase: 'GovernanceContinuityAssurance',
      reportLabel: 'Governance continuity assurance',
      reportMessage: 'Governance continuity assurance routed',
      mode: 'router',
      signalFields: ['governanceContinuity', 'assuranceCoverage', 'routerCost'],
      routeLabels: ['assurance-priority', 'assurance-balanced', 'assurance-review']
    },
    {
      phase: 516,
      title: 'Policy Recovery Continuity Harmonizer V29',
      fileName: 'policy-recovery-continuity-harmonizer-v29.ts',
      exportBase: 'PolicyRecoveryContinuity',
      reportLabel: 'Policy recovery continuity',
      reportMessage: 'Policy recovery continuity harmonized',
      mode: 'harmonizer',
      signalFields: ['policyRecovery', 'continuityDepth', 'harmonizerCost']
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
    expect(buildPhaseScriptEntry(515, 520, sampleBlock.testFile)).toContain('test:phase:515-520');
  });

  it('renders phase index entry', () => {
    expect(buildPhaseIndexEntry(sampleBlock.docFile)).toBe('- `PHASE_515_520_GOVERNANCE_CONTINUITY_ASSURANCE_RECOVERY_V29.md`');
  });

  it('renders module export block', () => {
    const block = buildModuleExportBlock(sampleBlock.modules[0], sampleBlock.version);
    expect(block).toContain("from './governance-continuity-assurance-router-v29'");
  });

  it('renders phase doc', () => {
    const doc = buildPhaseDoc(sampleBlock);
    expect(doc).toContain('# Phase 515-520');
  });

  it('renders router module source', () => {
    const source = buildPhaseModuleSource(sampleBlock.modules[0], sampleBlock.version);
    expect(source).toContain('class GovernanceContinuityAssuranceRouterV29');
    expect(source).toContain('assurance-balanced');
  });

  it('renders test suite imports and describes', () => {
    const suite = buildPhaseTestSuite(sampleBlock);
    expect(suite).toContain("from '../governance-continuity-assurance-router-v29'");
    expect(suite).toContain("describe('Phase 515: Governance Continuity Assurance Router V29'");
  });

  it('writes generated files to disk', () => {
    const dir = mkdtempSync(join(tmpdir(), 'phase-generator-'));
    try {
      const generated = writeGeneratedPhaseFiles(dir, sampleBlock);
      const doc = readFileSync(join(dir, sampleBlock.docFile), 'utf8');
      const testFile = readFileSync(join(dir, sampleBlock.testFile), 'utf8');
      const moduleFile = readFileSync(join(dir, 'src/lib', sampleBlock.modules[0].fileName), 'utf8');

      expect(generated.exports).toContain('GovernanceContinuityAssuranceBookV29');
      expect(doc).toContain('# Phase 515-520');
      expect(testFile).toContain('governanceContinuityAssuranceBookV29');
      expect(moduleFile).toContain('Governance continuity assurance');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('builds generated file bundle', () => {
    const generated = buildGeneratedPhaseFiles(sampleBlock);
    expect(Object.keys(generated.modules)).toHaveLength(2);
    expect(generated.doc).toContain('Governance Continuity Assurance & Recovery V29');
  });
});

describe('phase status sync helpers', () => {
  it('renders closed task block', () => {
    expect(
      buildClosedTaskBlock(
        'T-059',
        '509-514',
        'src/lib/__tests__/governance-assurance-recovery-suite-v28.test.ts',
        'PHASE_509_514_GOVERNANCE_ASSURANCE_RECOVERY_STABILITY_V28.md'
      )
    ).toContain('T-059');
  });

  it('normalizes duplicate open headers', () => {
    const tracker = ['## Open', '- `T-059` Phase 509-514 planning — closed', '', '## Open', '- `T-060` Phase 515-520 planning'].join('\n');
    const updated = normalizeTrackerOpenHeaders(tracker);
    expect(updated.match(/## Open/g)?.length).toBe(1);
  });

  it('replaces open task with closed task and next open task', () => {
    const tracker = [
      '## Open',
      '- `T-059` Phase 509-514 planning',
      '  - Scope: define architecture, contracts, and acceptance gates for next 6-phase block.',
      '  - Owner: engineering',
      '  - Status: ready'
    ].join('\n');

    const updated = replaceOpenTask(
      tracker,
      'T-059',
      '509-514',
      'T-060',
      '515-520',
      'src/lib/__tests__/governance-assurance-recovery-suite-v28.test.ts',
      'PHASE_509_514_GOVERNANCE_ASSURANCE_RECOVERY_STABILITY_V28.md'
    );

    expect(updated).toContain('T-060');
    expect(updated).toContain('closed');
    expect(updated.match(/## Open/g)?.length).toBe(1);
  });

  it('replaces next phase scope block', () => {
    const memory = [
      '## Next 6 Phases (Planned Scope)',
      '- `Phase 509`: Old',
      '',
      '## Checkpoint Rule'
    ].join('\n');

    const updated = replaceNextPhaseScope(memory, [
      { phase: 515, title: 'Governance Continuity Assurance Router V29' },
      { phase: 516, title: 'Policy Recovery Continuity Harmonizer V29' }
    ]);

    expect(updated).toContain('Phase 515');
    expect(updated).not.toContain('Old');
  });

  it('appends completed phase before open tasks', () => {
    const memory = [
      '## Completed Phases',
      '- `Phase 509-514 Governance Assurance Recovery & Stability V28`: complete',
      '',
      '## Open Tasks'
    ].join('\n');

    const updated = appendCompletedPhase(memory, 'Phase 515-520 Governance Continuity Assurance & Recovery V29');
    expect(updated).toContain('Phase 515-520 Governance Continuity Assurance & Recovery V29');
  });

  it('replaces optional kickoff line', () => {
    const memory = '- Optional: Phase 509-514 scope definition and kickoff.';
    expect(replaceOptionalKickoff(memory, 'Phase 515-520 scope definition and kickoff')).toContain('Phase 515-520');
  });

  it('formats checkpoint line consistently', () => {
    expect(formatCheckpointLine('Checkpoint 509-514: V28 block delivered')).toBe('- `Checkpoint 509-514`: V28 block delivered');
  });

  it('appends checkpoint before blockers', () => {
    const memory = [
      '## Checkpoint Notes',
      '- `Checkpoint 509-514`: done',
      '',
      '## Blockers'
    ].join('\n');

    const updated = appendCheckpoint(memory, 'Checkpoint 515-520: V29 block delivered with continuity/assurance contract pattern and bootstrap wrapper fix.' );
    expect(updated).toContain('Checkpoint 515-520');
  });

  it('syncs memory in one pass', () => {
    const memory = [
      '## Completed Phases',
      '- `Phase 509-514 Governance Assurance Recovery & Stability V28`: complete',
      '',
      '## Open Tasks',
      '- Optional: Phase 509-514 scope definition and kickoff.',
      '',
      '## Next 6 Phases (Planned Scope)',
      '- `Phase 509`: Old',
      '',
      '## Checkpoint Rule',
      '## Checkpoint Notes',
      '- `Checkpoint 509-514`: done',
      '',
      '## Blockers'
    ].join('\n');

    const updated = syncMemory(memory, {
      completedTitle: 'Phase 515-520 Governance Continuity Assurance & Recovery V29',
      optionalKickoff: 'Phase 521-526 scope definition and kickoff',
      nextScopes: [
        { phase: 521, title: 'Governance Recovery Continuity Router V30' },
        { phase: 522, title: 'Policy Assurance Recovery Harmonizer V30' }
      ],
      checkpoint: 'Checkpoint 515-520: V29 block delivered with continuity/assurance contract pattern and bootstrap wrapper fix.'
    });

    expect(updated).toContain('Phase 515-520 Governance Continuity Assurance & Recovery V29');
    expect(updated).toContain('Phase 521');
    expect(updated).toContain('Checkpoint 515-520');
  });
});

describe('worktree bootstrap helpers', () => {
  it('builds bootstrap steps with install', () => {
    const steps = buildWorktreeBootstrapSteps({
      rootDir: 'D:/repo',
      worktreePath: 'D:/repo-next',
      branchName: 'batch-phase-515',
      baseRef: 'origin/master',
      installDependencies: true
    });

    expect(steps).toEqual([
      { command: 'git', args: ['fetch', 'origin'], cwd: 'D:/repo' },
      { command: 'git', args: ['worktree', 'add', 'D:/repo-next', '-b', 'batch-phase-515', 'origin/master'], cwd: 'D:/repo' },
      { command: 'git', args: ['pull', '--ff-only', 'origin', 'master'], cwd: 'D:/repo-next' },
      { command: 'npm', args: ['ci'], cwd: 'D:/repo-next' }
    ]);
  });

  it('parses bootstrap args with trailing skip install', () => {
    const parsed = parseBootstrapArgs(['../repo-next', 'batch-phase-515', 'origin/master', '--skip-install']);
    expect(parsed.branchName).toBe('batch-phase-515');
    expect(parsed.baseRef).toBe('origin/master');
    expect(parsed.installDependencies).toBe(false);
  });

  it('parses bootstrap args with leading skip install', () => {
    const parsed = parseBootstrapArgs(['--skip-install', '../repo-next', 'batch-phase-515', 'origin/master']);
    expect(parsed.branchName).toBe('batch-phase-515');
    expect(parsed.worktreePath).toContain('repo-next');
    expect(parsed.installDependencies).toBe(false);
  });
});

describe('phase changelog helpers', () => {
  it('classifies phase and chore commits', () => {
    expect(classifyCommit('Phase 515-520: Governance Continuity Assurance Recovery V29')).toBe('phase');
    expect(classifyCommit('Chore: append phase changelog entry for 515-520')).toBe('chore');
    expect(classifyCommit('Fix: unrelated')).toBe(null);
  });

  it('builds changelog lines', () => {
    expect(buildChangelogLine('2026-04-09', 'phase', 'abc1234', 'Phase 515-520: Governance Continuity Assurance Recovery V29')).toBe(
      '- 2026-04-09 | phase | `abc1234` | Phase 515-520: Governance Continuity Assurance Recovery V29'
    );
  });

  it('appends unique changelog entries once', () => {
    const initial = '# Phase Changelog\n\n';
    const line = '- 2026-04-09 | phase | `abc1234` | Phase 515-520: Governance Continuity Assurance Recovery V29';
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
