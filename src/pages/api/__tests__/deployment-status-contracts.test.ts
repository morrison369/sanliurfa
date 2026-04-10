import { beforeEach, describe, expect, it, vi } from 'vitest';

const recordRequestMock = vi.fn();
const getCurrentEnvironmentMock = vi.fn();
const getReadinessStatusRuntimeMock = vi.fn();
const getDeploymentChecklistRuntimeMock = vi.fn();
const getRuntimeIntegrationSettingsMock = vi.fn();
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
  });
});
