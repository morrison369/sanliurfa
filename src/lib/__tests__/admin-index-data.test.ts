import { describe, expect, it, vi } from 'vitest';

vi.mock('../artifact-health', () => ({
  summarizeArtifactHealth: () => ({
    overall: 'degraded',
    healthyCount: 3,
    degradedCount: 1,
    blockedCount: 1,
    total: 5,
  }),
}));

describe('admin index data', () => {
  it('collects stats and builds page render models from injected deps', async () => {
    const { getAdminIndexData } = await import('../admin-index-data');
    const countMap = new Map<string, string>([
      ['SELECT COUNT(*) FROM places', '82'],
      ['SELECT COUNT(*) FROM users', '14'],
      ['SELECT COUNT(*) FROM reviews', '56'],
      ["SELECT COUNT(*) FROM contact_messages WHERE status = 'new'", '3'],
      ["SELECT COUNT(*) FROM places WHERE status = 'pending'", '7'],
    ]);

    const result = await getAdminIndexData({
      countQuery: async (sql) => ({ rows: [{ count: countMap.get(sql) ?? '0' }] }),
      getAccessCoverage: async () => ({
        available: true,
        generatedAt: '2026-04-16T08:00:00.000Z',
        routeFiles: 40,
        wrapperFiles: 39,
        driftCount: 1,
        coveragePercent: 98,
        driftedFiles: ['src/pages/api/admin/example.ts'],
      }),
      getArtifactHealth: async () => ({
        releaseGate: { available: true, generatedAt: '2026-04-16T10:00:00.000Z', status: 'healthy' },
        nightlyRegression: { available: true, generatedAt: '2026-04-16T09:00:00.000Z', status: 'degraded' },
        nightlyE2E: { available: true, generatedAt: '2026-04-16T07:00:00.000Z', status: 'healthy' },
        performanceOps: { available: true, generatedAt: '2026-04-16T06:00:00.000Z', status: 'healthy' },
        adminAccessCoverage: { available: true, generatedAt: '2026-04-16T08:00:00.000Z', status: 'healthy' },
      }),
      getReleaseGate: async () => ({
        available: true,
        generatedAt: '2026-04-16T10:00:00.000Z',
        finalStatus: 'failed',
        blockingFailedSteps: ['release-step'],
        advisoryFailedSteps: [],
        failedStepCount: 1,
        steps: [],
        performanceOptimization: null,
        adminAccessCoverage: null,
      }),
      getNightly: async () => ({
        regression: {
          available: true,
          kind: 'regression',
          generatedAt: '2026-04-16T09:00:00.000Z',
          outcome: 'failure',
          successRatePercent: 74,
          recentOutcomes: [],
          topFailures: ['nightly-failure'],
          performanceOptimization: null,
          adminAccessCoverage: null,
        },
        e2e: {
          available: true,
          kind: 'e2e',
          generatedAt: '2026-04-16T08:30:00.000Z',
          outcome: 'success',
          successRatePercent: 100,
          recentOutcomes: [],
          topFailures: [],
          performanceOptimization: null,
          adminAccessCoverage: null,
        },
      }),
    });

    expect(result.stats).toEqual({
      places: 82,
      users: 14,
      reviews: 56,
      messages: 3,
      pending: 7,
    });

    expect(result.riskCardViews.map((card) => card.title)).toEqual([
      'Release Gate',
      'Nightly',
      'Artifact Health',
      'Access Coverage',
    ]);
    expect(result.riskCardViews[0]?.detail).toBe('release-step');
    expect(result.riskCardViews[1]?.detail).toBe('nightly-failure');
    expect(result.toolCardViews.find((card) => card.title === 'Mekanlar')?.description).toBe('7 onay bekleyen');
    expect(result.toolCardViews.find((card) => card.title === 'Mesajlar')?.description).toBe('3 yeni mesaj');
  });
});
