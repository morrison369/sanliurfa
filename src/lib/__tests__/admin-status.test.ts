import { describe, expect, it } from 'vitest';
import {
  classifyIntegrationStatus,
  classifyNightlyStatus,
  classifyReleaseGateStatus
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
});
