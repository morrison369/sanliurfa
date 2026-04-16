import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildNightlySummary, buildPerformanceOptimizationSummary, buildReleaseGateSummary } from '../../test/fixtures/ops';

const getReleaseGateSummaryMock = vi.fn();
const getNightlyOpsSummaryMock = vi.fn();
const getPerformanceOptimizationSummaryMock = vi.fn();
const getAdminAccessCoverageMock = vi.fn();
const recentIso = (hoursAgo: number) => new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString();

vi.mock('../release-gate-summary', () => ({
  getReleaseGateSummary: getReleaseGateSummaryMock,
}));

vi.mock('../nightly-ops-summary', () => ({
  getNightlyOpsSummary: getNightlyOpsSummaryMock,
}));

vi.mock('../admin-dashboard', () => ({
  getPerformanceOptimizationSummary: getPerformanceOptimizationSummaryMock,
}));

vi.mock('../admin-access-coverage', () => ({
  getAdminAccessCoverage: getAdminAccessCoverageMock,
}));

describe('artifact health snapshot', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.resetAllMocks();
    const releaseGeneratedAt = recentIso(1);
    const nightlyGeneratedAt = recentIso(2);
    const performanceGeneratedAt = recentIso(3);

    getReleaseGateSummaryMock.mockResolvedValue(buildReleaseGateSummary({
      generatedAt: releaseGeneratedAt,
    }));
    getNightlyOpsSummaryMock.mockResolvedValue({
      regression: buildNightlySummary('regression', {
        generatedAt: nightlyGeneratedAt,
        successRatePercent: 100,
      }),
      e2e: buildNightlySummary('e2e', {
        available: false,
        generatedAt: null,
        outcome: 'missing',
        successRatePercent: null,
      }),
    });
    getPerformanceOptimizationSummaryMock.mockResolvedValue(buildPerformanceOptimizationSummary({
      generatedAt: performanceGeneratedAt,
    }));
    getAdminAccessCoverageMock.mockResolvedValue({
      available: true,
      generatedAt: recentIso(1),
      routeFiles: 39,
      wrapperFiles: 39,
      driftCount: 0,
      coveragePercent: 100,
      driftedFiles: [],
    });
  });

  it('builds release and nightly artifact health snapshot', async () => {
    const { getArtifactHealthSnapshot } = await import('../artifact-health');

    const result = await getArtifactHealthSnapshot();

    expect(result.releaseGate).toEqual({
      available: true,
      generatedAt: expect.any(String),
      status: 'healthy',
    });
    expect(result.nightlyRegression).toEqual({
      available: true,
      generatedAt: expect.any(String),
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
      performanceOpsGeneratedAt: recentIso(3),
    });

    expect(result.performanceOps).toEqual({
      available: true,
      generatedAt: expect.any(String),
      status: 'healthy',
    });
    expect(result.adminAccessCoverage).toBeUndefined();
  });

  it('builds admin artifact health snapshot with performance ops included', async () => {
    const { getAdminArtifactHealthSnapshot } = await import('../artifact-health');

    const result = await getAdminArtifactHealthSnapshot();

    expect(result.releaseGate.status).toBe('healthy');
    expect(result.nightlyRegression.status).toBe('healthy');
    expect(result.nightlyE2E.status).toBe('blocked');
    expect(result.performanceOps).toEqual({
      available: true,
      generatedAt: expect.any(String),
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
      adminAccessCoverage: { available: true, generatedAt: '2026-04-10T05:00:00.000Z', status: 'healthy' },
    });

    expect(result).toEqual({
      overall: 'blocked',
      healthyCount: 3,
      degradedCount: 1,
      blockedCount: 1,
      total: 5,
    });
  });
});
