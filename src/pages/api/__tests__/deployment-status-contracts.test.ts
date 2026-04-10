import { beforeEach, describe, expect, it, vi } from 'vitest';

const recordRequestMock = vi.fn();
const getCurrentEnvironmentMock = vi.fn();
const getReadinessStatusRuntimeMock = vi.fn();
const getDeploymentChecklistRuntimeMock = vi.fn();
const getRuntimeIntegrationSettingsMock = vi.fn();
const getPerformanceOptimizationSummaryMock = vi.fn();
const loggerMock = {
  setRequestId: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
  logMutation: vi.fn(),
};

vi.mock('../../../lib/metrics', () => ({
  recordRequest: recordRequestMock,
}));

vi.mock('../../../lib/deployment', () => ({
  getCurrentEnvironment: getCurrentEnvironmentMock,
  getReadinessStatusRuntime: getReadinessStatusRuntimeMock,
  getDeploymentChecklistRuntime: getDeploymentChecklistRuntimeMock,
}));

vi.mock('../../../lib/runtime-integration-settings', () => ({
  getRuntimeIntegrationSettings: getRuntimeIntegrationSettingsMock,
}));

vi.mock('../../../lib/admin-dashboard', () => ({
  getPerformanceOptimizationSummary: getPerformanceOptimizationSummaryMock,
}));

vi.mock('../../../lib/logging', () => ({
  logger: loggerMock,
}));

describe('admin deployment status contracts', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.resetAllMocks();

    getCurrentEnvironmentMock.mockReturnValue({
      name: 'production',
      url: 'https://sanliurfa.com',
      logLevel: 'warn',
      sslEnabled: true,
      maintenanceMode: false,
    });
    getReadinessStatusRuntimeMock.mockResolvedValue({
      ready: true,
      checks: { a: true, b: true },
      readyPercentage: 100,
    });
    getDeploymentChecklistRuntimeMock.mockResolvedValue({
      'Email service configured': true,
      'Redis configured': true,
    });
    getRuntimeIntegrationSettingsMock.mockResolvedValue({
      resendApiKey: 're_live123',
      analyticsId: '',
      source: { resendApiKey: 'admin', analyticsId: 'none' },
    });
    getPerformanceOptimizationSummaryMock.mockResolvedValue({
      generatedAt: '2026-04-10T03:00:00.000Z',
      recommendations: { total: 4, highPriority: 2, mediumPriority: 2 },
      metrics: {
        slowQueriesCount: 6,
        slowRequestRate: 14,
        cacheHitRate: 42,
        avgRequestDuration: 220,
        p95Duration: 780,
      },
      cacheStrategies: { count: 2 },
      indexSuggestions: { count: 3, top: ['CREATE INDEX idx_reviews_place_id ON reviews(place_id)'] },
      slowOperations: [],
    });
  });

  it('rejects unauthorized deployment status access', async () => {
    const { GET } = await import('../admin/deployment/status.ts');
    const request = new Request('https://example.com/api/admin/deployment/status');

    const response = await GET({
      request,
      locals: {},
    } as any);

    expect(response.status).toBe(403);
    expect(getCurrentEnvironmentMock).not.toHaveBeenCalled();
  });

  it('returns deployment status with integration source details for admin', async () => {
    const { GET } = await import('../admin/deployment/status.ts');
    const request = new Request('https://example.com/api/admin/deployment/status');

    const response = await GET({
      request,
      locals: { isAdmin: true },
    } as any);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.data.environment.name).toBe('production');
    expect(body.data.data.readiness.readyPercentage).toBe(100);
    expect(body.data.data.integrations.resend.configured).toBe(true);
    expect(body.data.data.integrations.resend.source).toBe('admin');
    expect(body.data.data.integrations.analytics.configured).toBe(false);
    expect(body.data.data.integrations.analytics.source).toBe('none');
    expect(body.data.data.integrations.summary.configuredCount).toBe(1);
    expect(body.data.data.integrations.summary.fullyConfigured).toBe(false);
    expect(body.data.data.artifactHealth.releaseGate.status).toBe('blocked');
    expect(body.data.data.artifactHealth.performanceOps.status).toBe('healthy');
    expect(body.data.data.artifactHealth.performanceOps.generatedAt).toBe('2026-04-10T03:00:00.000Z');
  });

  it('returns default none integration summary when nothing is configured', async () => {
    getRuntimeIntegrationSettingsMock.mockResolvedValueOnce({
      resendApiKey: '',
      analyticsId: '',
      source: { resendApiKey: 'none', analyticsId: 'none' },
    });

    const { GET } = await import('../admin/deployment/status.ts');
    const request = new Request('https://example.com/api/admin/deployment/status');

    const response = await GET({
      request,
      locals: { isAdmin: true },
    } as any);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.data.integrations.summary.configuredCount).toBe(0);
    expect(body.data.data.integrations.summary.total).toBe(2);
    expect(body.data.data.integrations.summary.fullyConfigured).toBe(false);
  });
});
