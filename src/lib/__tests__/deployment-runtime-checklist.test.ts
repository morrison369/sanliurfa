import { beforeEach, describe, expect, it, vi } from 'vitest';

process.env.DATABASE_URL ||= 'postgresql://postgres:postgres@127.0.0.1:5432/sanliurfa_test';

const getRuntimeIntegrationSettingsMock = vi.fn();

vi.mock('../runtime-integration-settings', () => ({
  getRuntimeIntegrationSettings: getRuntimeIntegrationSettingsMock,
}));

describe('deployment runtime checklist', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.resetAllMocks();
  });

  it('marks email service configured when runtime integration has resend key', async () => {
    getRuntimeIntegrationSettingsMock.mockResolvedValue({
      resendApiKey: 're_live123',
      analyticsId: '',
      source: { resendApiKey: 'admin', analyticsId: 'none' }
    });

    const { getDeploymentChecklistRuntime } = await import('../deployment');
    const checklist = await getDeploymentChecklistRuntime();

    expect(checklist['Email service configured']).toBe(true);
  });

  it('marks email service not configured when runtime integration has no resend key', async () => {
    getRuntimeIntegrationSettingsMock.mockResolvedValue({
      resendApiKey: '',
      analyticsId: '',
      source: { resendApiKey: 'none', analyticsId: 'none' }
    });

    const { getDeploymentChecklistRuntime } = await import('../deployment');
    const checklist = await getDeploymentChecklistRuntime();

    expect(checklist['Email service configured']).toBe(false);
  });
});
