import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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
  replaceCurrentPhaseWindow,
  replaceLastCompletedPhase,
  replaceNextPhaseScope,
  replaceOpenTask,
  replaceOptionalKickoff,
  syncMemory
} from '../../../scripts/phase-status-sync';
import { buildWorktreeBootstrapSteps, parseBootstrapArgs } from '../../../scripts/phase-worktree-bootstrap';
import { buildChangelogLine, classifyCommit, parseArgs, upsertChangelogEntry } from '../../../scripts/phase-changelog';
import { findDoctorIssues } from '../../../scripts/phase-doctor';
import { normalizeChangelog, parseChangelogLine } from '../../../scripts/phase-changelog-normalize';
import { buildScriptSurfaceReport, renderScriptSurfaceReport } from '../../../scripts/phase-scripts-report';
import { buildOpenArgs, buildViewArgs, parsePhasePrArgs } from '../../../scripts/phase-pr';
import { buildPhasePipelineEnv, buildPhasePipelineSteps, buildPipelineStepInvocation, parsePhasePipelineArgs, resolvePreferredTsxStep } from '../../../scripts/phase-pipeline';
import { buildPrChecksArgs, checksPublished, parsePhaseCheckWaitArgs } from '../../../scripts/phase-check-wait';
import { buildNodeVersionError, isSupportedNodeVersion, parseNodeVersion } from '../../../scripts/phase-env';
import { buildPhaseNodeInvocation, compareSemver, parsePhaseNodeArgs } from '../../../scripts/phase-node';
import { parsePhasePrOpenFileArgs } from '../../../scripts/phase-pr-open-file';
import { acquirePhaseLock, buildPhaseLockError, getPhaseLockPath, readPhaseLock, releasePhaseLock } from '../../../scripts/phase-lock';
import { buildPhaseGateSteps, parsePhaseGateArgs } from '../../../scripts/phase-gate-ci';
import { buildPhaseReleaseSteps, parsePhaseReleaseArgs } from '../../../scripts/phase-release';
import { ensureScriptExists, parsePhaseTestArgs, toScriptName } from '../../../scripts/phase-test';
import { parsePhaseBlockGeneratorArgs } from '../../../scripts/phase-block-generator';
import { parsePhaseBlockWriterArgs } from '../../../scripts/phase-block-writer';
import { hasMatchingMarkdownFiles } from '../content-loader-helpers';

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

describe('phase-test automation', () => {
  it('parses single range mode', () => {
    expect(parsePhaseTestArgs(['range', '947-952'])).toEqual({
      mode: 'range',
      ranges: ['947-952']
    });
  });

  it('parses batch mode with multiple ranges', () => {
    expect(parsePhaseTestArgs(['batch', '947-952', '953-958', '959-964'])).toEqual({
      mode: 'batch',
      ranges: ['947-952', '953-958', '959-964']
    });
  });

  it('normalizes range into script name', () => {
    expect(toScriptName('947-952')).toBe('test:phase:947-952');
  });

  it('rejects invalid ranges', () => {
    expect(() => toScriptName('latest')).toThrow(/Invalid phase range/);
  });

  it('rejects unknown phase scripts', () => {
    expect(() => ensureScriptExists('test:phase:947-952', { 'test:phase:941-946': 'vitest run' })).toThrow(
      /Unknown phase script/
    );
  });
});

describe('phase script surface report', () => {
  it('summarizes compatibility and runner scripts', () => {
    const report = buildScriptSurfaceReport({
      'test:phase:947-952': 'vitest run a',
      'test:phase:953-958': 'vitest run b',
      'test:phase:range': 'tsx scripts/phase-test.ts range',
      'test:phase:batch': 'tsx scripts/phase-test.ts batch',
      'phase:prepare:batch:preferred': 'tsx scripts/phase-release.ts',
      'phase:doctor': 'tsx scripts/phase-doctor.ts'
    });

    expect(report.compatibilityPhaseScripts).toEqual(['test:phase:947-952', 'test:phase:953-958']);
    expect(report.runnerScripts).toContain('test:phase:range');
    expect(renderScriptSurfaceReport(report)).toContain('compatibilityPhaseScripts=2');
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
  it('parses generator args with write flag in any position', () => {
    expect(parsePhaseBlockGeneratorArgs(['scripts/phase-blocks/phase-803-808.json', '--write'])).toEqual({
      configPath: 'scripts/phase-blocks/phase-803-808.json',
      shouldWrite: true
    });
    expect(parsePhaseBlockGeneratorArgs(['--write', 'scripts/phase-blocks/phase-803-808.json'])).toEqual({
      configPath: 'scripts/phase-blocks/phase-803-808.json',
      shouldWrite: true
    });
  });

  it('parses dedicated writer args', () => {
    expect(parsePhaseBlockWriterArgs(['scripts/phase-blocks/phase-803-808.json']).configPath).toBe(
      'scripts/phase-blocks/phase-803-808.json'
    );
  });

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
      '## Current Phase',
      '- Active window: `Phase 515-520` (planned)',
      '- Last completed: `Phase 509-514 Governance Assurance Recovery & Stability V28`',
      '',
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

  it('replaces current phase window', () => {
    const memory = '- Active window: `Phase 521-526` (planned)';
    expect(replaceCurrentPhaseWindow(memory, 'Phase 527-532')).toContain('Phase 527-532');
  });

  it('replaces last completed phase', () => {
    const memory = '- Last completed: `Phase 521-526 Governance Recovery Continuity & Assurance V30`';
    expect(replaceLastCompletedPhase(memory, 'Phase 527-532 Governance Continuity Stability & Assurance V31')).toContain('Phase 527-532');
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
      '## Current Phase',
      '- Active window: `Phase 515-520` (planned)',
      '- Last completed: `Phase 509-514 Governance Assurance Recovery & Stability V28`',
      '',
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
      currentPhase: 'Phase 521-526',
      lastCompleted: 'Phase 515-520 Governance Continuity Assurance & Recovery V29',
      completedTitle: 'Phase 515-520 Governance Continuity Assurance & Recovery V29',
      optionalKickoff: 'Phase 521-526 scope definition and kickoff',
      nextScopes: [
        { phase: 521, title: 'Governance Recovery Continuity Router V30' },
        { phase: 522, title: 'Policy Assurance Recovery Harmonizer V30' }
      ],
      checkpoint: 'Checkpoint 515-520: V29 block delivered with continuity/assurance contract pattern and bootstrap wrapper fix.'
    });

    expect(updated).toContain('Phase 515-520 Governance Continuity Assurance & Recovery V29');
    expect(updated).toContain('Active window: `Phase 521-526` (planned)');
    expect(updated).toContain('Phase 521');
    expect(updated).toContain('Checkpoint 515-520');
  });
});

describe('phase doctor', () => {
  it('warns when dated cleanup docs remain in repo root', () => {
    const dir = mkdtempSync(join(tmpdir(), 'phase-doctor-root-'));
    try {
      writeFileSync(join(dir, 'README.md'), '# README\n## Clean Worktree Politikası\nphase:scripts:report\n');
      writeFileSync(join(dir, 'STALE_WORKTREE.md'), '# stale\n');
      writeFileSync(join(dir, 'ROOT_INVENTORY_ONLY_POLICY.md'), '# policy\n');
      mkdirSync(join(dir, 'docs'), { recursive: true });
      writeFileSync(join(dir, 'docs', 'WORKTREE_SOURCE_OF_TRUTH.md'), '# truth\n');
      writeFileSync(join(dir, 'docs', 'ACTIVE_DOCS.md'), '# docs\n');
      writeFileSync(
        join(dir, 'package.json'),
        JSON.stringify({ scripts: { 'test:phase:range': 'x', 'test:phase:batch': 'y', 'phase:doctor': 'z', 'phase:prepare:block': 'a', 'phase:prepare:block:preferred': 'b', 'phase:prepare:batch': 'c' } })
      );
      writeFileSync(join(dir, 'DIRTY_ROOT_FINAL_REFRESH_2026-04-09.md'), '# dated\n');

      expect(findDoctorIssues(dir)).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            level: 'warn',
            message: expect.stringContaining('Root contains dated cleanup docs')
          })
        ])
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
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
    expect(classifyCommit('Chore: update phase changelog for 515-520')).toBe(null);
    expect(classifyCommit('Fix: unrelated')).toBe(null);
  });

  it('builds changelog lines', () => {
    expect(buildChangelogLine('2026-04-09', 'phase', 'abc1234', 'Phase 515-520: Governance Continuity Assurance Recovery V29')).toBe(
      '- 2026-04-09 | phase | `abc1234` | Phase 515-520: Governance Continuity Assurance Recovery V29'
    );
  });

  it('upserts unique changelog entries once', () => {
    const initial = '# Phase Changelog\n\n';
    const line = '- 2026-04-09 | phase | `abc1234` | Phase 515-520: Governance Continuity Assurance Recovery V29';
    const once = upsertChangelogEntry(initial, line, 'phase', 'Phase 515-520: Governance Continuity Assurance Recovery V29');
    const twice = upsertChangelogEntry(once, line, 'phase', 'Phase 515-520: Governance Continuity Assurance Recovery V29');
    expect(once).toContain(line);
    expect(twice).toBe(once);
  });

  it('replaces older changelog entry for the same phase subject', () => {
    const initial = [
      '# Phase Changelog',
      '',
      '- 2026-04-08 | phase | `old1234` | Phase 521-526: Governance Recovery Continuity Assurance V30',
      ''
    ].join('\n');
    const line = '- 2026-04-09 | phase | `new5678` | Phase 521-526: Governance Recovery Continuity Assurance V30';
    const updated = upsertChangelogEntry(initial, line, 'phase', 'Phase 521-526: Governance Recovery Continuity Assurance V30');

    expect(updated).toContain('new5678');
    expect(updated).not.toContain('old1234');
  });

  it('parses ref and out args', () => {
    const cwd = process.cwd();
    const parsed = parseArgs(['--ref', 'HEAD~1', '--out', 'tmp/PHASE_CHANGELOG.md']);
    expect(parsed.ref).toBe('HEAD~1');
    expect(parsed.outPath).toBe(join(cwd, 'tmp/PHASE_CHANGELOG.md'));
  });

  it('parses positional ref for npm wrapper compatibility', () => {
    const parsed = parseArgs(['HEAD']);
    expect(parsed.ref).toBe('HEAD');
  });

  it('parses malformed phase changelog lines and extracts the hash', () => {
    expect(parseChangelogLine('- 2026-04-09 | phase | 84e1045 | Phase 1019-1036: Governance Batch Delivery V113-V115')).toEqual({
      date: '2026-04-09',
      type: 'phase',
      hash: '84e1045',
      subject: 'Phase 1019-1036: Governance Batch Delivery V113-V115'
    });
  });

  it('normalizes duplicate phase rows by keeping the latest phase line', () => {
    const changelog = [
      '# Phase Changelog',
      '',
      '- 2026-04-09 | phase | `abc1234` | Phase 1019-1036: Governance Batch Delivery V113-V115',
      '- 2026-04-09 | phase | 84e1045 | Phase 1019-1036: Governance Batch Delivery V113-V115',
      ''
    ].join('\n');

    const normalized = normalizeChangelog(changelog);
    expect(normalized).toContain('`84e1045`');
    expect(normalized).not.toContain('abc1234');
    expect(normalized.match(/Phase 1019-1036: Governance Batch Delivery V113-V115/g)?.length).toBe(1);
  });

  it('drops malformed placeholder phase rows during normalization', () => {
    const changelog = [
      '# Phase Changelog',
      '',
      '- 2026-04-09 | phase | `84e1045` | Phase 1019-1036: Governance Batch Delivery V113-V115',
      '- 2026-04-09 | phase | $phaseHash | Phase 1019-1036: Governance Batch Delivery V113-V115',
      ''
    ].join('\n');

    const normalized = normalizeChangelog(changelog);
    expect(normalized).toContain('`84e1045`');
    expect(normalized).not.toContain('$phaseHash');
    expect(normalized.match(/Phase 1019-1036: Governance Batch Delivery V113-V115/g)?.length).toBe(1);
  });

  it('drops changelog-maintenance chore rows during normalization', () => {
    const changelog = [
      '# Phase Changelog',
      '',
      '- 2026-04-09 | phase | `84e1045` | Phase 1019-1036: Governance Batch Delivery V113-V115',
      '- 2026-04-09 | chore | `4e697ec` | Chore: update phase changelog for 1019-1036',
      '- 2026-04-09 | chore | `2d4a766` | Chore: harden source-of-truth and changelog operations',
      ''
    ].join('\n');

    const normalized = normalizeChangelog(changelog);
    expect(normalized).toContain('Phase 1019-1036: Governance Batch Delivery V113-V115');
    expect(normalized).toContain('Chore: harden source-of-truth and changelog operations');
    expect(normalized).not.toContain('Chore: update phase changelog for 1019-1036');
  });

  it('reports changelog drift through phase doctor', () => {
    const dir = mkdtempSync(join(tmpdir(), 'phase-doctor-'));
    try {
      mkdirSync(join(dir, 'docs'), { recursive: true });
      writeFileSync(join(dir, 'README.md'), '## Clean Worktree Politikası\n', 'utf8');
      writeFileSync(join(dir, 'PHASE_OPERATIONS_GUIDE.md'), '# guide\n', 'utf8');
      writeFileSync(join(dir, 'docs', 'WORKTREE_SOURCE_OF_TRUTH.md'), '# policy\n', 'utf8');
      writeFileSync(
        join(dir, 'PHASE_CHANGELOG.md'),
        '# Phase Changelog\n\n- 2026-04-09 | phase | abc1234 | Phase 1019-1036: Governance Batch Delivery V113-V115\n- 2026-04-09 | phase | $phaseHash | Phase 1019-1036: Governance Batch Delivery V113-V115\n- 2026-04-09 | phase | `84e1045` | Phase 1019-1036: Governance Batch Delivery V113-V115\n',
        'utf8'
      );

      const issues = findDoctorIssues(dir);
      expect(issues.some((issue) => issue.message.includes('not normalized'))).toBe(true);
      expect(issues.some((issue) => issue.message.includes('Duplicate phase changelog subjects'))).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('phase pr helpers', () => {
  it('parses open command with inline body', () => {
    const parsed = parsePhasePrArgs([
      'open',
      '--repo', 'titanai777/sanliurfa',
      '--base', 'master',
      '--head', 'batch-phase-689',
      '--title', 'Phase 689-694: Governance Assurance Stability Continuity V58',
      '--body', 'summary'
    ]);

    expect(parsed.mode).toBe('open');
    expect(parsed.open?.repo).toBe('titanai777/sanliurfa');
    expect(parsed.open?.head).toBe('batch-phase-689');
    expect(parsed.open?.body).toBe('summary');
  });

  it('builds gh api args for open', () => {
    expect(
      buildOpenArgs({
        repo: 'titanai777/sanliurfa',
        base: 'master',
        head: 'batch-phase-689',
        title: 'Phase 689-694: Governance Assurance Stability Continuity V58',
        body: 'summary'
      })
    ).toEqual([
      'api',
      'repos/titanai777/sanliurfa/pulls',
      '-f', 'title=Phase 689-694: Governance Assurance Stability Continuity V58',
      '-f', 'head=batch-phase-689',
      '-f', 'base=master',
      '-f', 'body=summary'
    ]);
  });

  it('parses view command and builds gh view args', () => {
    const parsed = parsePhasePrArgs(['view', '--repo', 'titanai777/sanliurfa', '--pr', '42']);
    expect(parsed.view?.prNumber).toBe(42);
    expect(buildViewArgs(parsed.view!)).toEqual([
      'pr',
      'view',
      '42',
      '--repo',
      'titanai777/sanliurfa',
      '--json',
      'state,mergeCommit,url'
    ]);
  });

  it('parses positional view args for npm wrapper compatibility', () => {
    const parsed = parsePhasePrArgs(['view', 'titanai777/sanliurfa', '53']);
    expect(parsed.view).toEqual({
      repo: 'titanai777/sanliurfa',
      prNumber: 53
    });
  });

  it('parses file-based PR open wrapper args', () => {
    const dir = mkdtempSync(join(tmpdir(), 'phase-pr-open-file-'));
    try {
      const titleFile = join(dir, 'title.txt');
      const bodyFile = join(dir, 'body.md');
      writeFileSync(titleFile, 'Phase 749-754: Governance Assurance Stability Continuity V68\n');
      writeFileSync(bodyFile, 'summary\n');
      const parsed = parsePhasePrOpenFileArgs(['titanai777/sanliurfa', 'master', 'phase-749-754', titleFile, bodyFile]);
      expect(parsed.title).toBe('Phase 749-754: Governance Assurance Stability Continuity V68');
      expect(parsed.body).toBe('summary\n');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('phase pipeline helpers', () => {
  it('parses optional phase script', () => {
    expect(parsePhasePipelineArgs(['--phase-script', 'test:phase:731-736']).phaseScript).toBe('test:phase:731-736');
  });

  it('parses positional phase script for npm wrapper forwarding', () => {
    expect(parsePhasePipelineArgs(['test:phase:743-748']).phaseScript).toBe('test:phase:743-748');
  });

  it('builds serialized phase steps', () => {
    expect(buildPhasePipelineSteps({ phaseScript: 'test:phase:731-736' })).toEqual([
      { command: 'npm', args: ['run', 'phase:env:check'] },
      { command: 'npm', args: ['run', 'phase:sync:tsconfig'] },
      { command: 'npm', args: ['run', 'phase:check:tsconfig'] },
      { command: 'npm', args: ['run', 'test:phase:731-736'] },
      { command: 'npm', args: ['run', 'lint:phase'] },
      { command: 'npm', args: ['run', 'test:phase:smoke'] },
      { command: 'npm', args: ['run', 'build'] }
    ]);
  });

  it('injects preferred node into npm child environment', () => {
    expect(buildPhasePipelineEnv({ PHASE_PREFERRED_NODE_EXE: 'C:/node.exe' }).npm_node_execpath).toBe('C:/node.exe');
  });

  it('maps repo-owned tsx steps for preferred node execution', () => {
    expect(resolvePreferredTsxStep({ command: 'npm', args: ['run', 'phase:env:check'] })).toEqual({
      script: 'scripts/phase-env.ts',
      args: []
    });
    expect(resolvePreferredTsxStep({ command: 'npm', args: ['run', 'phase:check:tsconfig'] })).toEqual({
      script: 'scripts/update-phase-tsconfig.ts',
      args: ['--check']
    });
  });

  it('rewrites npm steps to preferred node invocation', () => {
    const invocation = buildPipelineStepInvocation(
      { command: 'npm', args: ['run', 'build'] },
      { PHASE_PREFERRED_NODE_EXE: 'C:/node.exe', APPDATA: 'C:/Users/Oguz/AppData/Roaming' }
    );

    expect(invocation.command).toBe('C:/node.exe');
    expect(invocation.args[0]).toContain('npm-cli.js');
    expect(invocation.args.slice(1)).toEqual(['run', 'build']);
    expect(invocation.shell).toBe(false);
  });

  it('rewrites env-check to direct tsx under preferred node', () => {
    const invocation = buildPipelineStepInvocation(
      { command: 'npm', args: ['run', 'phase:env:check'] },
      { PHASE_PREFERRED_NODE_EXE: 'C:/node.exe', APPDATA: 'C:/Users/Oguz/AppData/Roaming' }
    );

    expect(invocation.command).toBe('C:/node.exe');
    expect(invocation.args[0]).toContain('tsx');
    expect(invocation.args[1]).toBe('scripts/phase-env.ts');
  });
});

describe('phase check wait helpers', () => {
  it('parses repo and timing overrides', () => {
    const parsed = parsePhaseCheckWaitArgs(['44', '--repo', 'titanai777/sanliurfa', '--poll-ms', '2000', '--timeout-ms', '90000']);
    expect(parsed).toEqual({
      prNumber: 44,
      repo: 'titanai777/sanliurfa',
      pollMs: 2000,
      timeoutMs: 90000
    });
  });

  it('builds gh pr checks args', () => {
    expect(buildPrChecksArgs({ prNumber: 44, repo: 'titanai777/sanliurfa', pollMs: 5000, timeoutMs: 180000 }, true)).toEqual([
      'pr',
      'checks',
      '44',
      '--repo',
      'titanai777/sanliurfa',
      '--watch'
    ]);
  });

  it('detects unpublished and published checks', () => {
    expect(checksPublished('no checks reported on the branch')).toBe(false);
    expect(checksPublished('phase:check:tsconfig\tpass\t20s')).toBe(true);
  });
});

describe('phase env helpers', () => {
  it('parses semver node versions', () => {
    expect(parseNodeVersion('v22.13.0')).toEqual({ major: 22, minor: 13, patch: 0 });
  });

  it('enforces repo node floor', () => {
    expect(isSupportedNodeVersion('v22.13.0')).toBe(true);
    expect(isSupportedNodeVersion('v22.12.0')).toBe(false);
  });

  it('renders actionable node mismatch error', () => {
    expect(buildNodeVersionError('v22.12.0')).toContain('nvm use 22.13.0');
  });
});

describe('phase node helpers', () => {
  it('orders semver correctly', () => {
    expect(compareSemver('v22.13.0', 'v22.22.0')).toBeLessThan(0);
  });

  it('parses preferred-node wrapper args', () => {
    expect(parsePhaseNodeArgs(['run-script', 'phase:env:check']).target).toBe('phase:env:check');
  });

  it('builds npm-script invocation through preferred node', () => {
    process.env.APPDATA = 'C:/Users/Oguz/AppData/Roaming';
    const invocation = buildPhaseNodeInvocation({
      mode: 'run-script',
      target: 'phase:env:check',
      args: []
    });
    expect(invocation.args).toContain('run');
    expect(invocation.args).toContain('phase:env:check');
  });
});

describe('phase lock helpers', () => {
  it('creates and releases a worktree lock', () => {
    const dir = mkdtempSync(join(tmpdir(), 'phase-lock-'));
    try {
      const lockPath = acquirePhaseLock('phase-test', dir);
      expect(getPhaseLockPath(dir)).toBe(lockPath);
      expect(readPhaseLock(lockPath)?.operation).toBe('phase-test');
      releasePhaseLock(lockPath);
      expect(readPhaseLock(lockPath)).toBeNull();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('renders a helpful lock error message', () => {
    expect(
      buildPhaseLockError('D:/repo/.phase-worktree.lock', {
        pid: 12,
        operation: 'phase-gate-ci',
        startedAt: '2026-04-09T00:00:00.000Z',
        cwd: 'D:/repo'
      })
    ).toContain('phase-gate-ci');
  });

  it('fails on a live second lock acquisition in the same worktree', () => {
    const dir = mkdtempSync(join(tmpdir(), 'phase-lock-live-'));
    try {
      const lockPath = acquirePhaseLock('phase-gate-ci', dir);
      expect(() => acquirePhaseLock('phase-release', dir)).toThrow(/already locked/);
      releasePhaseLock(lockPath);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('clears stale lock metadata before taking a new lock', () => {
    const dir = mkdtempSync(join(tmpdir(), 'phase-lock-stale-'));
    try {
      const lockPath = getPhaseLockPath(dir);
      writeFileSync(
        lockPath,
        JSON.stringify({
          pid: 999999,
          operation: 'phase-gate-ci',
          startedAt: '2026-04-09T00:00:00.000Z',
          cwd: dir
        })
      );

      const freshLock = acquirePhaseLock('phase-release', dir);
      expect(readPhaseLock(freshLock)?.operation).toBe('phase-release');
      releasePhaseLock(freshLock);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('phase gate helpers', () => {
  it('parses ci flag', () => {
    expect(parsePhaseGateArgs(['--ci']).ci).toBe(true);
    expect(parsePhaseGateArgs([]).ci).toBe(false);
  });

  it('builds gate steps with optional tsconfig check', () => {
    expect(buildPhaseGateSteps({ ci: true })[0]).toEqual({ command: 'npm', args: ['run', 'phase:check:tsconfig'] });
    expect(buildPhaseGateSteps({ ci: false })[0]).toEqual({ command: 'npm', args: ['run', 'lint:phase'] });
  });
});

describe('phase release helpers', () => {
  it('parses repeated phase-script args', () => {
    expect(
      parsePhaseReleaseArgs(['--phase-script', 'test:phase:785-790', '--phase-script', 'test:phase:791-796']).phaseScripts
    ).toEqual(['test:phase:785-790', 'test:phase:791-796']);
  });

  it('parses positional phase scripts for npm wrapper compatibility', () => {
    expect(parsePhaseReleaseArgs(['test:phase:785-790', 'test:phase:791-796']).phaseScripts).toEqual([
      'test:phase:785-790',
      'test:phase:791-796'
    ]);
  });

  it('builds serialized batch release steps', () => {
    expect(
      buildPhaseReleaseSteps({ phaseScripts: ['test:phase:785-790', 'test:phase:791-796'] })
    ).toEqual([
      { command: 'npm', args: ['run', 'phase:env:check'] },
      { command: 'npm', args: ['run', 'phase:sync:tsconfig'] },
      { command: 'npm', args: ['run', 'phase:check:tsconfig'] },
      { command: 'npm', args: ['run', 'test:phase:785-790'] },
      { command: 'npm', args: ['run', 'test:phase:791-796'] },
      { command: 'npm', args: ['run', 'lint:phase'] },
      { command: 'npm', args: ['run', 'test:phase:smoke'] },
      { command: 'npm', args: ['run', 'build'] }
    ]);
  });
});

describe('content loader helpers', () => {
  it('returns false when markdown files are absent', () => {
    const dir = mkdtempSync(join(tmpdir(), 'content-loader-empty-'));
    try {
      expect(hasMatchingMarkdownFiles(dir)).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('returns true when nested markdown files exist', () => {
    const dir = mkdtempSync(join(tmpdir(), 'content-loader-md-'));
    try {
      const nested = join(dir, 'nested');
      mkdirSync(nested, { recursive: true });
      writeFileSync(join(nested, 'entry.md'), '# demo\n');
      expect(hasMatchingMarkdownFiles(dir)).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
