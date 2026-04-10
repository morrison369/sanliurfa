import { describe, expect, it } from 'vitest';
import { gitOpsEngine, terraformManager } from '../gitops-infrastructure';
import { runbookManager } from '../operations-control';
import { secretRotationManager } from '../secrets-management';

describe('Runtime determinism wave 6', () => {
  it('keeps GitOps and Terraform plans deterministic for the same inputs', () => {
    gitOpsEngine.initializeRepository('https://example.com/org/repo.git', 'main');

    const syncA = gitOpsEngine.syncRepository();
    const syncB = gitOpsEngine.syncRepository();
    expect(syncA.changesApplied).toBe(syncB.changesApplied);

    const planA = terraformManager.createPlan('networking');
    const planB = terraformManager.createPlan('networking');

    expect({
      additions: planA.additions,
      modifications: planA.modifications,
      deletions: planA.deletions
    }).toEqual({
      additions: planB.additions,
      modifications: planB.modifications,
      deletions: planB.deletions
    });
  });

  it('keeps runbook execution deterministic for the same runbook and context shape', () => {
    const runbook = runbookManager.createRunbook({
      name: 'Cache Flush',
      procedure: 'step1\nstep2\nstep3',
      status: 'active',
      applicableTo: ['cache'],
      lastUpdated: 1704067200000
    });

    const execA = runbookManager.executeRunbook(runbook.id, { region: 'eu', dryRun: true });
    const execB = runbookManager.executeRunbook(runbook.id, { dryRun: false, region: 'eu' });

    expect(execA.executionId).toMatch(/^exec-/);
    expect(execB.executionId).toMatch(/^exec-/);
    expect(execA.duration).toBe(execB.duration);
    expect(execA.success).toBe(execB.success);
    expect(execA.stepsExecuted).toBe(execB.stepsExecuted);
  });

  it('keeps secret rotation version deterministic for the same policy', () => {
    secretRotationManager.scheduleRotation('api-key', 30, 'rolling');

    const rotatedA = secretRotationManager.rotate('api-key', 'next-secret');
    const rotatedB = secretRotationManager.rotate('api-key', 'next-secret');

    expect(rotatedA.rotated).toBe(true);
    expect(rotatedA.newVersion).toBe(rotatedB.newVersion);
  });
});
