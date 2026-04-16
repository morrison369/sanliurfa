import { describe, expect, it, vi } from 'vitest';

vi.mock('../admin-browser-client', () => ({
  buildAdminAccessCoverageReportUrl: (format: 'json' | 'markdown') => `/api/admin/system/admin-access-coverage?format=${format}`,
  fetchAdminAccessCoverageReport: async () => ({ mocked: true }),
  fetchAdminPerformanceOptimization: async () => ({ optimized: true }),
}));

describe('runtime monitor helpers', () => {
  it('builds monitor endpoints with coverage summary support', async () => {
    const { buildRuntimeMonitorEndpoints } = await import('../runtime-monitor');

    const endpoints = buildRuntimeMonitorEndpoints(async (url) => ({ data: { status: url.includes('health') ? 'healthy' : 'degraded' } }));
    const coverage = endpoints.find((entry) => entry.key === 'admin-access-coverage');

    expect(endpoints).toHaveLength(5);
    expect(coverage?.summaryId).toBe('admin-access-coverage-summary');
    expect(
      coverage?.summarize?.({
        data: { report: { coveragePercent: 100, driftCount: 0, driftedFiles: [] } },
      })
    ).toContain('Coverage %100');
  });

  it('provides summary tone classes and download links', async () => {
    const {
      applyRuntimeMonitorCoverageLinks,
      buildRuntimeMonitorSummaryTone,
      runtimeMonitorBadgeStyles,
    } = await import('../runtime-monitor');

    expect(buildRuntimeMonitorSummaryTone('blocked')).toContain('text-red-600');
    expect(buildRuntimeMonitorSummaryTone('degraded')).toContain('text-amber-600');
    expect(runtimeMonitorBadgeStyles.healthy).toContain('text-green-800');
    expect(applyRuntimeMonitorCoverageLinks()).toEqual({
      json: '/api/admin/system/admin-access-coverage?format=json',
      markdown: '/api/admin/system/admin-access-coverage?format=markdown',
    });
  });
});
