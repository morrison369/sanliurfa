import { beforeEach, describe, expect, it, vi } from 'vitest';

const recordRequestMock = vi.fn();
const acknowledgeAlertMock = vi.fn();
const resolveAlertMock = vi.fn();
const validateWithSchemaMock = vi.fn();
const queryRowsMock = vi.fn();
const queryOneMock = vi.fn();
const queryMock = vi.fn();
const updateMock = vi.fn();
const runSecurityAuditMock = vi.fn();
const generateAuditReportHTMLMock = vi.fn();
const getUserUsageMock = vi.fn();
const resetUsageMock = vi.fn();
const updateUserQuotasMock = vi.fn();
const generateUserReportMock = vi.fn();
const generatePlacesReportMock = vi.fn();
const generateReviewsReportMock = vi.fn();
const generateRevenueReportMock = vi.fn();
const generateEngagementReportMock = vi.fn();
const getSummaryStatsMock = vi.fn();
const reportToCSVMock = vi.fn();
const reportToJSONMock = vi.fn();
const approveVendorMock = vi.fn();
const rejectVendorMock = vi.fn();
const getUserSubscriptionDetailsMock = vi.fn();
const changeUserTierMock = vi.fn();
const loggerMock = {
  setRequestId: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
  logMutation: vi.fn(),
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
  query: queryMock,
  update: updateMock,
  insert: vi.fn(),
}));

vi.mock('../../../lib/security-audit', () => ({
  runSecurityAudit: runSecurityAuditMock,
  generateAuditReportHTML: generateAuditReportHTMLMock,
}));

vi.mock('../../../lib/usage-tracking', () => ({
  getUserUsage: getUserUsageMock,
  resetUsage: resetUsageMock,
  updateUserQuotas: updateUserQuotasMock,
}));

vi.mock('../../../lib/reporting', () => ({
  generateUserReport: generateUserReportMock,
  generatePlacesReport: generatePlacesReportMock,
  generateReviewsReport: generateReviewsReportMock,
  generateRevenueReport: generateRevenueReportMock,
  generateEngagementReport: generateEngagementReportMock,
  getSummaryStats: getSummaryStatsMock,
  reportToCSV: reportToCSVMock,
  reportToJSON: reportToJSONMock,
}));

vi.mock('../../../lib/vendor-onboarding', () => ({
  approveVendor: approveVendorMock,
  rejectVendor: rejectVendorMock,
}));

vi.mock('../../../lib/subscription-admin', () => ({
  getUserSubscriptionDetails: getUserSubscriptionDetailsMock,
  changeUserTier: changeUserTierMock,
  logAdminAction: vi.fn(),
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
    getUserUsageMock.mockResolvedValue([
      {
        featureName: 'featured_listing',
        currentUsage: 2,
        limitValue: 5,
        resetDate: '2026-04-11T00:00:00.000Z',
      },
    ]);
    resetUsageMock.mockResolvedValue(undefined);
    updateUserQuotasMock.mockResolvedValue(undefined);
    generateUserReportMock.mockResolvedValue([{ id: 'u1' }]);
    generatePlacesReportMock.mockResolvedValue([{ id: 'p1' }]);
    generateReviewsReportMock.mockResolvedValue([{ id: 'r1' }]);
    generateRevenueReportMock.mockResolvedValue([{ id: 'rev1' }]);
    generateEngagementReportMock.mockResolvedValue([{ id: 'eng1' }]);
    getSummaryStatsMock.mockReturnValue({ total: 1 });
    reportToCSVMock.mockReturnValue('id\nu1');
    reportToJSONMock.mockReturnValue('{"ok":true}');
    approveVendorMock.mockResolvedValue(true);
    rejectVendorMock.mockResolvedValue(true);
    getUserSubscriptionDetailsMock.mockResolvedValue({
      userId: '12345678-1234-1234-1234-123456789012',
      tier: 'gold',
      status: 'active',
    });
    changeUserTierMock.mockResolvedValue(true);
    queryMock.mockResolvedValue(undefined);
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

  it('returns quotas for admins via standardized read access', async () => {
    const { GET } = await import('../admin/quotas/[userId].ts');
    const request = new Request('https://example.com/api/admin/quotas/12345678-1234-1234-1234-123456789012');

    const response = await GET({
      request,
      locals: { isAdmin: true, user: { id: 'admin-1', role: 'admin' } },
      params: { userId: '12345678-1234-1234-1234-123456789012' },
    } as any);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.totalQuotas).toBe(1);
    expect(body.data.quotas[0].remaining).toBe(3);
  });

  it('resets quotas for admins via standardized write access', async () => {
    const { POST } = await import('../admin/quotas/[userId].ts');
    const request = new Request('https://example.com/api/admin/quotas/12345678-1234-1234-1234-123456789012', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'reset_all' }),
    });

    const response = await POST({
      request,
      locals: { isAdmin: true, user: { id: 'admin-1', role: 'admin' } },
      params: { userId: '12345678-1234-1234-1234-123456789012' },
    } as any);

    expect(response.status).toBe(200);
    expect(updateUserQuotasMock).toHaveBeenCalledWith('12345678-1234-1234-1234-123456789012');
  });

  it('generates admin report JSON for admins', async () => {
    const { POST } = await import('../admin/reports/generate.ts');
    const request = new Request('https://example.com/api/admin/reports/generate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'users', period: 'weekly', format: 'json' }),
    });

    const response = await POST({
      request,
      locals: { isAdmin: true, user: { id: 'admin-1', role: 'admin' } },
    } as any);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.success).toBe(true);
    expect(body.data.data.summary.total).toBe(1);
  });

  it('approves vendor for admins', async () => {
    const { POST } = await import('../admin/vendor/[id]/approve.ts');
    const request = new Request('https://example.com/api/admin/vendor/vendor-1/approve', {
      method: 'POST',
    });

    const response = await POST({
      request,
      locals: { isAdmin: true, user: { id: 'admin-1', role: 'admin' } },
      params: { id: 'vendor-1' },
    } as any);

    expect(response.status).toBe(200);
    expect(approveVendorMock).toHaveBeenCalledWith('vendor-1');
  });

  it('rejects vendor with validation for admins', async () => {
    validateWithSchemaMock.mockReturnValueOnce({
      valid: true,
      data: { reason: 'Belgeler eksik ve kriterleri karşılamıyor.' },
      errors: [],
    });

    const { POST } = await import('../admin/vendor/[id]/reject.ts');
    const request = new Request('https://example.com/api/admin/vendor/vendor-1/reject', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ reason: 'Belgeler eksik ve kriterleri karşılamıyor.' }),
    });

    const response = await POST({
      request,
      locals: { isAdmin: true, user: { id: 'admin-1', role: 'admin' } },
      params: { id: 'vendor-1' },
    } as any);

    expect(response.status).toBe(200);
    expect(rejectVendorMock).toHaveBeenCalledWith('vendor-1', 'Belgeler eksik ve kriterleri karşılamıyor.');
  });

  it('lists subscription users for admins via standardized read access', async () => {
    queryRowsMock.mockResolvedValueOnce([
      {
        id: 'user-1',
        email: 'user@example.com',
        full_name: 'User One',
        subscription_id: 'sub-1',
        tier: 'Gold',
        status: 'active',
        created_at: '2026-04-10T00:00:00.000Z',
      },
    ]);

    const { GET } = await import('../admin/subscriptions/users.ts');
    const request = new Request('https://example.com/api/admin/subscriptions/users?status=active&limit=20');

    const response = await GET({
      request,
      url: new URL(request.url),
      locals: { isAdmin: true, user: { id: 'admin-1', role: 'admin' } },
    } as any);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.count).toBe(1);
    expect(body.data.users[0].email).toBe('user@example.com');
  });

  it('changes subscription tier for admins via standardized write access', async () => {
    queryOneMock.mockResolvedValueOnce({ id: 'tier-1' });

    const { POST } = await import('../admin/subscriptions/users.ts');
    const request = new Request('https://example.com/api/admin/subscriptions/users?userId=12345678-1234-1234-1234-123456789012&action=change_tier', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ newTierId: '87654321-4321-4321-4321-210987654321', reason: 'upgrade' }),
    });

    validateWithSchemaMock.mockReturnValueOnce({
      valid: true,
      data: { newTierId: '87654321-4321-4321-4321-210987654321', reason: 'upgrade' },
      errors: [],
    });

    const response = await POST({
      request,
      url: new URL(request.url),
      locals: { isAdmin: true, user: { id: 'admin-1', role: 'admin' } },
    } as any);

    expect(response.status).toBe(200);
    expect(changeUserTierMock).toHaveBeenCalledWith(
      'admin-1',
      '12345678-1234-1234-1234-123456789012',
      '87654321-4321-4321-4321-210987654321',
      'upgrade'
    );
  });

  it('updates contact message status for admins via standardized write access', async () => {
    const { POST } = await import('../admin/messages/[id]/status.ts');
    const formData = new FormData();
    formData.set('status', 'replied');
    const request = new Request('https://example.com/api/admin/messages/msg-1/status', {
      method: 'POST',
      body: formData,
    });

    const response = await POST({
      request,
      params: { id: 'msg-1' },
      locals: { isAdmin: true, user: { id: 'admin-1', role: 'admin' } },
    } as any);

    expect(response.status).toBe(200);
    expect(queryMock).toHaveBeenCalledTimes(1);
    expect(queryMock.mock.calls[0][0]).toContain('UPDATE contact_messages');
    expect(queryMock.mock.calls[0][1][0]).toBe('replied');
    expect(queryMock.mock.calls[0][1][2]).toBe('msg-1');
  });
});
