import { beforeEach, describe, expect, it, vi } from 'vitest';

const recordRequestMock = vi.fn();
const acknowledgeAlertMock = vi.fn();
const resolveAlertMock = vi.fn();
const validateWithSchemaMock = vi.fn();
const queryRowsMock = vi.fn();
const queryOneMock = vi.fn();
const updateMock = vi.fn();
const runSecurityAuditMock = vi.fn();
const generateAuditReportHTMLMock = vi.fn();
const loggerMock = {
  setRequestId: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
};

vi.mock('../../../lib/admin-ops-access', () => ({
  withAdminOpsWriteAccess: async (options: { locals?: { isAdmin?: boolean; user?: { role?: string } } }, handler: () => Promise<Response>) => {
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
  getAlerts: vi.fn(),
  acknowledgeAlert: acknowledgeAlertMock,
  resolveAlert: resolveAlertMock,
  performHealthCheck: vi.fn(),
}));

vi.mock('../../../lib/validation', () => ({
  validateWithSchema: validateWithSchemaMock,
}));

vi.mock('../../../lib/postgres', () => ({
  queryRows: queryRowsMock,
  queryOne: queryOneMock,
  update: updateMock,
  insert: vi.fn(),
}));

vi.mock('../../../lib/security-audit', () => ({
  runSecurityAudit: runSecurityAuditMock,
  generateAuditReportHTML: generateAuditReportHTMLMock,
}));

vi.mock('../../../lib/logging', () => ({
  logger: loggerMock,
}));

describe('admin write access contracts', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.resetAllMocks();

    acknowledgeAlertMock.mockResolvedValue(true);
    resolveAlertMock.mockResolvedValue(true);
    validateWithSchemaMock.mockReturnValue({
      valid: true,
      data: {
        type: 'users',
        period: 'weekly',
        frequency: 'weekly',
        email: 'admin@example.com',
      },
      errors: [],
    });
    queryOneMock.mockResolvedValue({
      id: 'sched-1',
      report_type: 'users',
      period: 'weekly',
      frequency: 'weekly',
      email: 'admin@example.com',
      enabled: true,
    });
    updateMock.mockResolvedValue(true);
    runSecurityAuditMock.mockResolvedValue({ overallScore: 91 });
    generateAuditReportHTMLMock.mockReturnValue('<html><body>ok</body></html>');
  });

  it('rejects unauthorized alert mutation', async () => {
    const { PUT } = await import('../admin/alerts.ts');
    const request = new Request('https://example.com/api/admin/alerts', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ acknowledged: true }),
    });

    const response = await PUT({ request, locals: {}, params: { alertId: 'alert-1' } } as any);
    expect(response.status).toBe(403);
  });

  it('acknowledges alert for admins', async () => {
    const { PUT } = await import('../admin/alerts.ts');
    const request = new Request('https://example.com/api/admin/alerts', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ acknowledged: true }),
    });

    const response = await PUT({
      request,
      locals: { isAdmin: true, user: { id: 'admin-1', role: 'admin' } },
      params: { alertId: 'alert-1' },
    } as any);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.success).toBe(true);
    expect(acknowledgeAlertMock).toHaveBeenCalledWith('alert-1', 'admin-1');
  });

  it('creates scheduled report for admins', async () => {
    const { POST } = await import('../admin/reports/schedule.ts');
    const request = new Request('https://example.com/api/admin/reports/schedule', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        type: 'users',
        period: 'weekly',
        frequency: 'weekly',
        email: 'admin@example.com',
      }),
    });

    const response = await POST({
      request,
      locals: { isAdmin: true, user: { id: 'admin-1', role: 'admin' } },
    } as any);

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.data.success).toBe(true);
    expect(body.data.data.id).toBe('sched-1');
  });

  it('rejects invalid scheduled report payloads', async () => {
    validateWithSchemaMock.mockReturnValueOnce({
      valid: false,
      data: null,
      errors: [{ field: 'email', message: 'invalid' }],
    });

    const { POST } = await import('../admin/reports/schedule.ts');
    const request = new Request('https://example.com/api/admin/reports/schedule', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });

    const response = await POST({
      request,
      locals: { isAdmin: true, user: { id: 'admin-1', role: 'admin' } },
    } as any);

    expect(response.status).toBe(422);
  });

  it('disables scheduled report for admins', async () => {
    const { DELETE } = await import('../admin/reports/schedule.ts');
    const request = new Request('https://example.com/api/admin/reports/schedule?id=sched-1', {
      method: 'DELETE',
    });

    const response = await DELETE({
      request,
      locals: { isAdmin: true, user: { id: 'admin-1', role: 'admin' } },
      url: new URL(request.url),
    } as any);

    expect(response.status).toBe(200);
    expect(updateMock).toHaveBeenCalled();
  });

  it('renders security audit HTML for admins', async () => {
    const { POST } = await import('../admin/security/audit.ts');
    const request = new Request('https://example.com/api/admin/security/audit', {
      method: 'POST',
    });

    const response = await POST({
      request,
      locals: { isAdmin: true, user: { id: 'admin-1', role: 'admin' } },
    } as any);

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/html');
    expect(generateAuditReportHTMLMock).toHaveBeenCalledTimes(1);
  });
});
