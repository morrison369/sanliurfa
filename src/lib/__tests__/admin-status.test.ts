import { describe, expect, it } from 'vitest';
import {
  classifyOverallOpsStatus,
  classifyThresholdStatus,
  classifyIntegrationStatus,
  classifyNightlyStatus,
  classifyReleaseGateStatus,
  classifyArtifactFreshnessStatus
} from '../admin-status';

describe('admin status helpers', () => {
  it('classifies integration states deterministically', () => {
    expect(classifyIntegrationStatus({ configuredCount: 0, total: 2 })).toBe('blocked');
    expect(classifyIntegrationStatus({ configuredCount: 1, total: 2 })).toBe('degraded');
    expect(classifyIntegrationStatus({ configuredCount: 2, total: 2, verificationHealthy: true })).toBe('healthy');
  });

  it('classifies nightly states deterministically', () => {
    expect(classifyNightlyStatus({ available: false, outcome: 'missing', successRatePercent: null })).toBe('blocked');
    expect(classifyNightlyStatus({ available: true, outcome: 'failure', successRatePercent: 57 })).toBe('degraded');
    expect(classifyNightlyStatus({ available: true, outcome: 'success', successRatePercent: 90 })).toBe('healthy');
  });

  it('classifies release gate states deterministically', () => {
    expect(classifyReleaseGateStatus({ available: false, finalStatus: 'missing', failedStepCount: 0 })).toBe('blocked');
    expect(classifyReleaseGateStatus({ available: true, finalStatus: 'failed', failedStepCount: 1 })).toBe('degraded');
    expect(classifyReleaseGateStatus({ available: true, finalStatus: 'passed', failedStepCount: 0 })).toBe('healthy');
  });

  it('classifies threshold and overall ops states deterministically', () => {
    expect(classifyThresholdStatus({ blockedWhen: true, degradedWhen: true })).toBe('blocked');
    expect(classifyThresholdStatus({ blockedWhen: false, degradedWhen: true })).toBe('degraded');
    expect(classifyThresholdStatus({ blockedWhen: false, degradedWhen: false })).toBe('healthy');
    expect(classifyOverallOpsStatus(['healthy', 'healthy'])).toBe('healthy');
    expect(classifyOverallOpsStatus(['healthy', 'degraded'])).toBe('degraded');
    expect(classifyOverallOpsStatus(['healthy', 'blocked'])).toBe('blocked');
  });

  it('classifies artifact freshness deterministically', () => {
    expect(classifyArtifactFreshnessStatus({
      available: false,
      generatedAt: null,
      degradedAfterHours: 24
    })).toBe('blocked');

    expect(classifyArtifactFreshnessStatus({
      available: true,
      generatedAt: new Date(Date.now() - (48 * 60 * 60 * 1000)).toISOString(),
      degradedAfterHours: 24
    })).toBe('degraded');

    expect(classifyArtifactFreshnessStatus({
      available: true,
      generatedAt: new Date().toISOString(),
      degradedAfterHours: 24
    })).toBe('healthy');
  });
});
