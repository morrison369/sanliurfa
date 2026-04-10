import { beforeEach, describe, expect, it, vi } from 'vitest';

const getReleaseGateSummaryMock = vi.fn();
const getNightlyOpsSummaryMock = vi.fn();
const getPerformanceOptimizationSummaryMock = vi.fn();

vi.mock('../release-gate-summary', () => ({
  getReleaseGateSummary: getReleaseGateSummaryMock,
}));

vi.mock('../nightly-ops-summary', () => ({
  getNightlyOpsSummary: getNightlyOpsSummaryMock,
}));

vi.mock('../admin-dashboard', () => ({
  getPerformanceOptimizationSummary: getPerformanceOptimizationSummaryMock,
}));

describe('artifact health snapshot', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.resetAllMocks();

    getReleaseGateSummaryMock.mockResolvedValue({
      available: true,
      generatedAt: '2026-04-10T08:00:00.000Z',
      finalStatus: 'passed',
      failedStepCount: 0,
    });
    getNightlyOpsSummaryMock.mockResolvedValue({
      regression: {
        available: true,
        generatedAt: '2026-04-10T07:00:00.000Z',
        outcome: 'success',
        successRatePercent: 100,
      },
      e2e: {
        available: false,
        generatedAt: null,
        outcome: 'missing',
        successRatePercent: null,
      },
    });
    getPerformanceOptimizationSummaryMock.mockResolvedValue({
      generatedAt: '2026-04-10T06:00:00.000Z',
    });
  });

  it('builds release and nightly artifact health snapshot', async () => {
    const { getArtifactHealthSnapshot } = await import('../artifact-health');

    const result = await getArtifactHealthSnapshot();

    expect(result.releaseGate).toEqual({
      available: true,
      generatedAt: '2026-04-10T08:00:00.000Z',
      status: 'healthy',
    });
    expect(result.nightlyRegression).toEqual({
      available: true,
      generatedAt: '2026-04-10T07:00:00.000Z',
      status: 'healthy',
    });
    expect(result.nightlyE2E).toEqual({
      available: false,
      generatedAt: null,
      status: 'blocked',
    });
    expect(result.performanceOps).toBeUndefined();
  });

  it('optionally includes performance ops artifact health', async () => {
    const { getArtifactHealthSnapshot } = await import('../artifact-health');

    const result = await getArtifactHealthSnapshot({
      includePerformanceOps: true,
      performanceOpsGeneratedAt: '2026-04-10T06:00:00.000Z',
    });

    expect(result.performanceOps).toEqual({
      available: true,
      generatedAt: '2026-04-10T06:00:00.000Z',
      status: 'healthy',
    });
  });

  it('builds admin artifact health snapshot with performance ops included', async () => {
    const { getAdminArtifactHealthSnapshot } = await import('../artifact-health');

    const result = await getAdminArtifactHealthSnapshot();

    expect(result.releaseGate.status).toBe('healthy');
    expect(result.nightlyRegression.status).toBe('healthy');
    expect(result.nightlyE2E.status).toBe('blocked');
    expect(result.performanceOps).toEqual({
      available: true,
      generatedAt: '2026-04-10T06:00:00.000Z',
      status: 'healthy',
    });
  });

  it('summarizes admin artifact health deterministically', async () => {
    const { summarizeArtifactHealth } = await import('../artifact-health');

    const result = summarizeArtifactHealth({
      releaseGate: { available: true, generatedAt: '2026-04-10T08:00:00.000Z', status: 'healthy' },
      nightlyRegression: { available: true, generatedAt: '2026-04-10T07:00:00.000Z', status: 'degraded' },
      nightlyE2E: { available: false, generatedAt: null, status: 'blocked' },
      performanceOps: { available: true, generatedAt: '2026-04-10T06:00:00.000Z', status: 'healthy' },
    });

    expect(result).toEqual({
      overall: 'blocked',
      healthyCount: 2,
      degradedCount: 1,
      blockedCount: 1,
      total: 4,
    });
  });
});
