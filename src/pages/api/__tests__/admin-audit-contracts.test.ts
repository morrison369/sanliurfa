import { beforeEach, describe, expect, it, vi } from 'vitest';

const getAuditLogsMock = vi.fn();
const getUserActivitySummaryMock = vi.fn();
const getResourceHistoryMock = vi.fn();
const findSuspiciousActivityMock = vi.fn();
const readAdminOpsAuditEntriesMock = vi.fn();
const summarizeAdminOpsAuditMock = vi.fn();
const recordRequestMock = vi.fn();
const loggerMock = {
  setRequestId: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
};

vi.mock('../../../lib/audit', () => ({
  getAuditLogs: getAuditLogsMock,
  getUserActivitySummary: getUserActivitySummaryMock,
  getResourceHistory: getResourceHistoryMock,
  findSuspiciousActivity: findSuspiciousActivityMock,
}));

vi.mock('../../../lib/admin-ops-audit', () => ({
  readAdminOpsAuditEntries: readAdminOpsAuditEntriesMock,
  summarizeAdminOpsAudit: summarizeAdminOpsAuditMock,
}));

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

vi.mock('../../../lib/logging', () => ({
  logger: loggerMock,
}));

vi.mock('../../../lib/metrics', () => ({
  recordRequest: recordRequestMock,
}));

describe('admin audit contracts', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.resetAllMocks();
    summarizeAdminOpsAuditMock.mockReturnValue({
      generatedAt: '2026-04-10T00:00:00.000Z',
      windowHours: 24,
      total: 4,
      deniedCount: 1,
      rateLimitedCount: 1,
      writeCount: 2,
      readCount: 2,
      lastDeniedAt: '2026-04-10T00:00:00.000Z',
    });
    readAdminOpsAuditEntriesMock.mockReturnValue([
      {
        timestamp: '2026-04-10T00:00:00.000Z',
        endpoint: '/api/admin/system/integration-settings',
        method: 'PUT',
        mode: 'write',
        requestId: 'req-1',
        actorKey: 'admin-1',
        userId: 'admin-1',
        ipAddress: '203.0.113.1',
        statusCode: 200,
        duration: 42,
        outcome: 'allowed',
      },
      {
        timestamp: '2026-04-09T23:59:00.000Z',
        endpoint: '/api/admin/system/metrics',
        method: 'GET',
        mode: 'read',
        requestId: 'req-2',
        actorKey: 'admin-2',
        userId: 'admin-2',
        ipAddress: '203.0.113.2',
        statusCode: 429,
        duration: 15,
        outcome: 'denied',
      },
    ]);
  });

  it('rejects unauthorized audit access', async () => {
    const { GET } = await import('../admin/audit-logs.ts');
    const request = new Request('https://example.com/api/admin/audit-logs');
    const response = await GET({ request, locals: {} } as any);
    expect(response.status).toBe(403);
  });

  it('returns admin ops audit sink with summary', async () => {
    const { GET } = await import('../admin/audit-logs.ts');
    const request = new Request('https://example.com/api/admin/audit-logs?source=admin-ops&limit=100');
    const response = await GET({ request, url: new URL(request.url), locals: { isAdmin: true, user: { id: 'admin-1', role: 'admin' } } } as any);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.logs).toHaveLength(2);
    expect(body.data.summary.deniedCount).toBe(1);
    expect(body.data.summary.rateLimitedCount).toBe(1);
    expect(body.data.logs[0].requestId).toBe('req-1');
  });

  it('filters admin ops audit sink by requestId', async () => {
    const { GET } = await import('../admin/audit-logs.ts');
    const request = new Request('https://example.com/api/admin/audit-logs?source=admin-ops&requestId=req-2');
    const response = await GET({ request, url: new URL(request.url), locals: { isAdmin: true, user: { id: 'admin-1', role: 'admin' } } } as any);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.logs).toHaveLength(1);
    expect(body.data.logs[0].requestId).toBe('req-2');
  });
});
