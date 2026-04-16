import { beforeEach, describe, expect, it, vi } from 'vitest';

const recordRequestMock = vi.fn();
const getPendingVerificationsMock = vi.fn();
const approveVerificationMock = vi.fn();
const rejectVerificationMock = vi.fn();
const getSubscriptionAnalyticsMock = vi.fn();
const getWebhookStatusMock = vi.fn();
const getAllUsersMock = vi.fn();
const getUserDetailsMock = vi.fn();
const flagUserAccountMock = vi.fn();
const changeUserRoleMock = vi.fn();
const logAdminUserActionMock = vi.fn();
const getModerationQueueMock = vi.fn();
const assignModerationQueueItemMock = vi.fn();
const resolveModerationQueueItemMock = vi.fn();
const validateWithSchemaMock = vi.fn();
const loggerMock = {
  setRequestId: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
  logMutation: vi.fn(),
};

vi.mock('../../../lib/admin-ops-access', () => ({
  withAdminOpsReadAccess: async (
    options: { locals?: { isAdmin?: boolean; user?: { role?: string } } },
    handler: () => Promise<Response>
  ) => {
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
  withAdminOpsWriteAccess: async (
    options: { locals?: { isAdmin?: boolean; user?: { role?: string } } },
    handler: () => Promise<Response>
  ) => {
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

vi.mock('../../../lib/place-verification', () => ({
  getPendingVerifications: getPendingVerificationsMock,
  approveVerification: approveVerificationMock,
  rejectVerification: rejectVerificationMock,
}));

vi.mock('../../../lib/subscription-admin', () => ({
  getSubscriptionAnalytics: getSubscriptionAnalyticsMock,
  getWebhookStatus: getWebhookStatusMock,
}));

vi.mock('../../../lib/admin-users', () => ({
  getAllUsers: getAllUsersMock,
  getUserDetails: getUserDetailsMock,
  flagUserAccount: flagUserAccountMock,
  changeUserRole: changeUserRoleMock,
  logAdminAction: logAdminUserActionMock,
}));

vi.mock('../../../lib/admin-moderation', () => ({
  getModerationQueue: getModerationQueueMock,
  assignModerationQueueItem: assignModerationQueueItemMock,
  resolveModerationQueueItem: resolveModerationQueueItemMock,
}));

vi.mock('../../../lib/validation', () => ({
  validateWithSchema: validateWithSchemaMock,
}));

vi.mock('../../../lib/logging', () => ({
  logger: loggerMock,
}));

describe('admin second wave contracts', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.resetAllMocks();

    getPendingVerificationsMock.mockResolvedValue([
      {
        id: 'ver-1',
        placeId: 'place-1',
        placeName: 'Gobeklitepe Cafe',
        category: 'cafe',
        rating: 4.7,
        requestedAt: '2026-04-10T00:00:00.000Z',
        reason: 'Yer dogrulama talebi',
      },
    ]);
    approveVerificationMock.mockResolvedValue(true);
    rejectVerificationMock.mockResolvedValue(true);
    getSubscriptionAnalyticsMock.mockResolvedValue({
      totalSubscriptions: 10,
      activeSubscriptions: 8,
      cancelledSubscriptions: 2,
      byTier: { Gold: 5, Business: 3 },
      mrr: 1200,
      arr: 8400,
      averageLifetimeValue: 2500,
      churnRate: 4.5,
    });
    getWebhookStatusMock.mockResolvedValue({
      pending: 1,
      failed: 2,
      successful: 18,
      retrying: 1,
      lastDelivery: '2026-04-11T00:00:00.000Z',
    });
    getAllUsersMock.mockResolvedValue([
      {
        id: 'user-1',
        email: 'user@example.com',
        full_name: 'User One',
        role: 'user',
        created_at: '2026-04-01T00:00:00.000Z',
        updated_at: '2026-04-10T00:00:00.000Z',
        last_login_at: '2026-04-10T00:00:00.000Z',
        last_activity_at: '2026-04-10T00:00:00.000Z',
        post_count: 1,
        review_count: 2,
        warning_count: 0,
        suspension_count: 0,
        active_flags: 0,
      },
    ]);
    getUserDetailsMock.mockResolvedValue({
      user: { id: 'user-1', email: 'user@example.com' },
      activeFlags: [],
      recentModeration: [],
      auditLog: [],
    });
    flagUserAccountMock.mockResolvedValue('flag-1');
    changeUserRoleMock.mockResolvedValue(undefined);
    logAdminUserActionMock.mockResolvedValue(undefined);
    getModerationQueueMock.mockResolvedValue([
      {
        id: 'mq-1',
        queue_type: 'report',
        item_type: 'review',
        item_id: 'review-1',
        priority: 'high',
        reason: 'spam',
        submitted_count: 3,
        last_reported_at: '2026-04-10T00:00:00.000Z',
        assigned_to_admin_id: null,
        status: 'pending',
        created_at: '2026-04-10T00:00:00.000Z',
        assigned_admin_email: null,
      },
    ]);
    assignModerationQueueItemMock.mockResolvedValue(undefined);
    resolveModerationQueueItemMock.mockResolvedValue(undefined);
    validateWithSchemaMock.mockImplementation((body: any, schema: any) => {
      if (schema?.reason?.required && (!body.reason || body.reason.length < 10)) {
        return { valid: false, data: body, errors: [{ field: 'reason', message: 'too short' }] };
      }
      return { valid: true, data: body, errors: [] };
    });
  });

  it('rejects unauthorized verification list access', async () => {
    const { GET } = await import('../admin/verifications/index.ts');
    const request = new Request('https://example.com/api/admin/verifications?limit=10');
    const response = await GET({ request, locals: {}, url: new URL(request.url) } as any);

    expect(response.status).toBe(403);
  });

  it('returns pending verifications for admins', async () => {
    const { GET } = await import('../admin/verifications/index.ts');
    const request = new Request('https://example.com/api/admin/verifications?limit=10');
    const response = await GET({
      request,
      locals: { isAdmin: true, user: { id: 'admin-1', role: 'admin' } },
      url: new URL(request.url),
    } as any);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.success).toBe(true);
    expect(body.data.verifications).toHaveLength(1);
    expect(body.data.verifications[0].placeName).toBe('Gobeklitepe Cafe');
  });

  it('approves verification via standardized write access', async () => {
    const { POST } = await import('../admin/verifications/[id]/approve.ts');
    const request = new Request('https://example.com/api/admin/verifications/ver-1/approve', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ reason: 'Belgeler yeterli' }),
    });

    const response = await POST({
      request,
      locals: { isAdmin: true, user: { id: 'admin-1', role: 'admin' } },
      params: { id: 'ver-1' },
    } as any);

    expect(response.status).toBe(200);
    expect(approveVerificationMock).toHaveBeenCalledWith('ver-1', 'admin-1', 'Belgeler yeterli');
  });

  it('rejects verification with validated reason via standardized write access', async () => {
    const { POST } = await import('../admin/verifications/[id]/reject.ts');
    const request = new Request('https://example.com/api/admin/verifications/ver-1/reject', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ reason: 'Eksik belge nedeniyle reddedildi' }),
    });

    const response = await POST({
      request,
      locals: { isAdmin: true, user: { id: 'admin-1', role: 'admin' } },
      params: { id: 'ver-1' },
    } as any);

    expect(response.status).toBe(200);
    expect(rejectVerificationMock).toHaveBeenCalledWith('ver-1', 'admin-1', 'Eksik belge nedeniyle reddedildi');
  });

  it('returns subscription analytics for admins', async () => {
    const { GET } = await import('../admin/subscriptions/analytics.ts');
    const request = new Request('https://example.com/api/admin/subscriptions/analytics');
    const response = await GET({
      request,
      locals: { isAdmin: true, user: { id: 'admin-1', role: 'admin' } },
    } as any);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.success).toBe(true);
    expect(body.data.subscriptions.totalSubscriptions).toBe(10);
    expect(body.data.webhooks.successful).toBe(18);
  });

  it('returns users list for admins', async () => {
    const { GET } = await import('../admin/users/index.ts');
    const request = new Request('https://example.com/api/admin/users?search=user&limit=50');
    const response = await GET({
      request,
      locals: { user: { id: 'admin-1', role: 'admin' } },
    } as any);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.success).toBe(true);
    expect(body.data.data.users).toHaveLength(1);
    expect(body.data.data.hasMore).toBe(false);
  });

  it('returns user details for admins', async () => {
    const { GET } = await import('../admin/users/[id].ts');
    const request = new Request('https://example.com/api/admin/users/user-1');
    const response = await GET({
      request,
      params: { id: 'user-1' },
      locals: { user: { id: 'admin-1', role: 'admin' } },
    } as any);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.success).toBe(true);
    expect(body.data.data.user.email).toBe('user@example.com');
  });

  it('flags user via standardized write access', async () => {
    const { POST } = await import('../admin/users/[id].ts');
    const request = new Request('https://example.com/api/admin/users/user-1', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        action: 'flag',
        flagType: 'spam',
        reason: 'Tekrarlanan spam davranisi',
        severity: 'high',
      }),
    });

    const response = await POST({
      request,
      params: { id: 'user-1' },
      locals: { user: { id: 'admin-1', role: 'admin' } },
    } as any);

    expect(response.status).toBe(200);
    expect(flagUserAccountMock).toHaveBeenCalledWith('user-1', 'admin-1', 'spam', 'Tekrarlanan spam davranisi', 'high', undefined);
  });

  it('returns moderation queue for admins', async () => {
    const { GET } = await import('../admin/moderation/queue.ts');
    const request = new Request('https://example.com/api/admin/moderation/queue?status=pending&limit=20');
    const response = await GET({
      request,
      locals: { user: { id: 'admin-1', role: 'admin' } },
    } as any);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.success).toBe(true);
    expect(body.data.data.items).toHaveLength(1);
  });

  it('resolves moderation queue item via standardized write access', async () => {
    const { POST } = await import('../admin/moderation/queue.ts');
    const request = new Request('https://example.com/api/admin/moderation/queue', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ queueItemId: 'mq-1', action: 'resolve', resolution: 'removed' }),
    });

    const response = await POST({
      request,
      locals: { user: { id: 'admin-1', role: 'admin' } },
    } as any);

    expect(response.status).toBe(200);
    expect(resolveModerationQueueItemMock).toHaveBeenCalledWith('mq-1', 'admin-1', 'removed');
  });
});
