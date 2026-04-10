import { beforeEach, describe, expect, it, vi } from 'vitest';

const recordRequestMock = vi.fn();
const getAlertsMock = vi.fn();
const performHealthCheckMock = vi.fn();
const getMonitoringDashboardMock = vi.fn();
const getCriticalAlertsMock = vi.fn();
const exportMonitoringDataMock = vi.fn();
const queryOneMock = vi.fn();
const queryRowsMock = vi.fn();
const loggerMock = {
  setRequestId: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
};

vi.mock('../../../lib/admin-ops-access', () => ({
  withAdminOpsReadAccess: async (options: { locals?: { isAdmin?: boolean; user?: { role?: string } } }, handler: () => Promise<Response>) => {
    if (options.locals?.isAdmin || options.locals?.user?.role === 'admin') {
      return handler();
    }

    return new Response(
      JSON.stringify({
        error: {
          code: 'FORBIDDEN',
          message: 'Admin access required',
        },
      }),
      {
        status: 403,
        headers: { 'content-type': 'application/json' },
      }
    );
  },
}));

vi.mock('../../../lib/metrics', () => ({
  recordRequest: recordRequestMock,
}));

vi.mock('../../../lib/alerts', () => ({
  getAlerts: getAlertsMock,
  acknowledgeAlert: vi.fn(),
  resolveAlert: vi.fn(),
  performHealthCheck: performHealthCheckMock,
}));

vi.mock('../../../lib/monitoring', () => ({
  getMonitoringDashboard: getMonitoringDashboardMock,
  getCriticalAlerts: getCriticalAlertsMock,
  exportMonitoringData: exportMonitoringDataMock,
}));

vi.mock('../../../lib/postgres', () => ({
  queryOne: queryOneMock,
  queryRows: queryRowsMock,
}));

vi.mock('../../../lib/logging', () => ({
  logger: loggerMock,
}));

describe('admin read access contracts', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.resetAllMocks();

    getAlertsMock.mockResolvedValue([
      { id: 'a1', severity: 'warning', acknowledged: false },
    ]);
    getMonitoringDashboardMock.mockReturnValue({
      services: [{ name: 'db', status: 'healthy' }],
      uptime: 12345,
    });
    getCriticalAlertsMock.mockReturnValue([{ id: 'c1' }]);
    exportMonitoringDataMock.mockReturnValue({ exported: true });
    queryOneMock.mockResolvedValue({
      total_metrics: 10,
      avg_ttfb: 120,
      avg_fcp: 350,
      avg_lcp: 900,
      avg_dcl: 1100,
      p95_ttfb: 210,
      p95_fcp: 460,
      p95_lcp: 1300,
      lcp_fails: 0,
      ttfb_fails: 0,
      dcl_fails: 0,
      active_connections: 4,
      total_disk_reads: 10,
      total_cache_hits: 90,
      connection_count: 4,
      total_dead_rows: 0,
    });
    queryRowsMock.mockResolvedValue([]);
  });

  it('rejects unauthorized admin alerts access', async () => {
    const { GET } = await import('../admin/alerts.ts');
    const request = new Request('https://example.com/api/admin/alerts');
    const response = await GET({ request, locals: {}, url: new URL(request.url) } as any);

    expect(response.status).toBe(403);
    expect(getAlertsMock).not.toHaveBeenCalled();
  });

  it('returns alerts and supports health check for admins', async () => {
    const { GET } = await import('../admin/alerts.ts');
    const request = new Request('https://example.com/api/admin/alerts?healthCheck=true&limit=10');
    const response = await GET({
      request,
      locals: { isAdmin: true, user: { id: 'admin-1', role: 'admin' } },
      url: new URL(request.url),
    } as any);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.alerts).toHaveLength(1);
    expect(body.data.count).toBe(1);
    expect(performHealthCheckMock).toHaveBeenCalledTimes(1);
  });

  it('returns monitoring dashboard and export data for admins', async () => {
    const { GET } = await import('../admin/monitoring/dashboard.ts');
    const request = new Request('https://example.com/api/admin/monitoring/dashboard?format=export');
    const response = await GET({
      request,
      locals: { isAdmin: true, user: { id: 'admin-1', role: 'admin' } },
      url: new URL(request.url),
    } as any);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.success).toBe(true);
    expect(body.data.data.exported).toBe(true);
  });

  it('returns performance summary for admins', async () => {
    const { GET } = await import('../admin/performance/summary.ts');
    const request = new Request('https://example.com/api/admin/performance/summary');
    const response = await GET({
      request,
      locals: { user: { id: 'admin-1', role: 'admin' } },
    } as any);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.success).toBe(true);
    expect(body.data.data.performance.database.cacheHitRatio).toBe('90.00%');
  });

  it('returns sorted performance recommendations for admins', async () => {
    queryRowsMock
      .mockResolvedValueOnce([{ indexname: 'idx_unused_1' }])
      .mockResolvedValueOnce([{ tablename: 'heavy_table' }])
      .mockResolvedValueOnce([{ query: 'select 1', mean_time: 150, calls: 3 }]);
    queryOneMock
      .mockResolvedValueOnce({ total_dead_rows: 12000 })
      .mockResolvedValueOnce({ connection_count: 20 });

    const { GET } = await import('../admin/performance/recommendations.ts');
    const request = new Request('https://example.com/api/admin/performance/recommendations');
    const response = await GET({
      request,
      locals: { user: { id: 'admin-1', role: 'admin' } },
    } as any);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.success).toBe(true);
    expect(body.data.data.recommendations.length).toBeGreaterThan(1);
    expect(body.data.data.recommendations[0].priority).toBe('high');
  });
});
