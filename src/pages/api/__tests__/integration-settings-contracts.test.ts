import { beforeEach, describe, expect, it, vi } from 'vitest';

const recordRequestMock = vi.fn();
const getRuntimeIntegrationSettingsMock = vi.fn();
const saveRuntimeIntegrationSettingMock = vi.fn();
const isValidResendKeyMock = vi.fn();
const isValidAnalyticsIdMock = vi.fn();
const logAdminActionMock = vi.fn();
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

vi.mock('../../../lib/runtime-integration-settings', () => ({
  getRuntimeIntegrationSettings: getRuntimeIntegrationSettingsMock,
  saveRuntimeIntegrationSetting: saveRuntimeIntegrationSettingMock,
  isValidResendKey: isValidResendKeyMock,
  isValidAnalyticsId: isValidAnalyticsIdMock,
}));

vi.mock('../../../lib/admin-users', () => ({
  logAdminAction: logAdminActionMock,
}));

vi.mock('../../../lib/logging', () => ({
  logger: loggerMock,
}));

describe('integration settings contracts', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.resetAllMocks();
    getRuntimeIntegrationSettingsMock.mockResolvedValue({
      resendApiKey: '',
      analyticsId: '',
      source: {
        resendApiKey: 'none',
        analyticsId: 'none',
      },
    });
    saveRuntimeIntegrationSettingMock.mockResolvedValue(undefined);
    logAdminActionMock.mockResolvedValue(undefined);
    isValidResendKeyMock.mockImplementation((value: string) => /^re_[a-z0-9]+$/i.test(value));
    isValidAnalyticsIdMock.mockImplementation((value: string) => /^G-[A-Z0-9]+$/i.test(value));
  });

  it('rejects unauthorized GET', async () => {
    const { GET } = await import('../admin/system/integration-settings.ts');
    const request = new Request('https://example.com/api/admin/system/integration-settings');

    const response = await GET({
      request,
      locals: {},
    } as any);

    expect(response.status).toBe(403);
    expect(getRuntimeIntegrationSettingsMock).not.toHaveBeenCalled();
  });

  it('returns masked integration status for admin GET', async () => {
    getRuntimeIntegrationSettingsMock.mockResolvedValueOnce({
      resendApiKey: 're_1234567890abcdef',
      analyticsId: 'G-TEST12345',
      source: {
        resendApiKey: 'admin',
        analyticsId: 'env',
      },
    });

    const { GET } = await import('../admin/system/integration-settings.ts');
    const request = new Request('https://example.com/api/admin/system/integration-settings');

    const response = await GET({
      request,
      locals: { user: { id: 'admin-1', role: 'admin' } },
    } as any);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.data.resend.configured).toBe(true);
    expect(body.data.data.resend.source).toBe('admin');
    expect(body.data.data.analytics.configured).toBe(true);
    expect(body.data.data.analytics.source).toBe('env');
    expect(typeof body.data.data.resend.maskedValue).toBe('string');
  });

  it('rejects non-json PUT payload', async () => {
    const { PUT } = await import('../admin/system/integration-settings.ts');
    const request = new Request('https://example.com/api/admin/system/integration-settings', {
      method: 'PUT',
      headers: {
        'content-type': 'text/plain',
      },
      body: 'resend=bad',
    });

    const response = await PUT({
      request,
      locals: { user: { id: 'admin-1', role: 'admin' } },
    } as any);

    expect(response.status).toBe(400);
    expect(saveRuntimeIntegrationSettingMock).not.toHaveBeenCalled();
  });

  it('rejects invalid resend key format with 422', async () => {
    const { PUT } = await import('../admin/system/integration-settings.ts');
    const request = new Request('https://example.com/api/admin/system/integration-settings', {
      method: 'PUT',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        resendApiKey: 'invalid-key',
      }),
    });

    const response = await PUT({
      request,
      locals: { user: { id: 'admin-1', role: 'admin' } },
    } as any);

    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.error.details.field).toBe('resendApiKey');
    expect(saveRuntimeIntegrationSettingMock).not.toHaveBeenCalled();
  });

  it('rejects invalid analytics id format with 422', async () => {
    const { PUT } = await import('../admin/system/integration-settings.ts');
    const request = new Request('https://example.com/api/admin/system/integration-settings', {
      method: 'PUT',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        analyticsId: 'UA-12345',
      }),
    });

    const response = await PUT({
      request,
      locals: { user: { id: 'admin-1', role: 'admin' } },
    } as any);

    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.error.details.field).toBe('analyticsId');
    expect(saveRuntimeIntegrationSettingMock).not.toHaveBeenCalled();
  });

  it('saves both keys and writes admin audit action on PUT', async () => {
    getRuntimeIntegrationSettingsMock.mockResolvedValueOnce({
      resendApiKey: 're_livekey1234',
      analyticsId: 'G-LIVE1234',
      source: {
        resendApiKey: 'admin',
        analyticsId: 'admin',
      },
    });

    const { PUT } = await import('../admin/system/integration-settings.ts');
    const request = new Request('https://example.com/api/admin/system/integration-settings', {
      method: 'PUT',
      headers: {
        'content-type': 'application/json',
        'x-request-id': 'req-abc',
        'x-forwarded-for': '203.0.113.8',
        'user-agent': 'vitest',
      },
      body: JSON.stringify({
        resendApiKey: 're_livekey1234',
        analyticsId: 'G-LIVE1234',
      }),
    });

    const response = await PUT({
      request,
      locals: { user: { id: 'admin-1', role: 'admin' } },
    } as any);

    expect(response.status).toBe(200);
    expect(saveRuntimeIntegrationSettingMock).toHaveBeenCalledTimes(2);
    expect(saveRuntimeIntegrationSettingMock).toHaveBeenCalledWith({
      settingKey: 'resendApiKey',
      value: 're_livekey1234',
      adminId: 'admin-1',
    });
    expect(saveRuntimeIntegrationSettingMock).toHaveBeenCalledWith({
      settingKey: 'analyticsId',
      value: 'G-LIVE1234',
      adminId: 'admin-1',
    });
    expect(logAdminActionMock).toHaveBeenCalledWith(
      'admin-1',
      'admin-1',
      'update_integration_settings',
      expect.objectContaining({
        updatedKeys: ['resendApiKey', 'analyticsId'],
        resendConfigured: true,
        analyticsConfigured: true,
      }),
      expect.objectContaining({
        requestId: 'req-abc',
        ipAddress: '203.0.113.8',
      }),
    );
  });
});
