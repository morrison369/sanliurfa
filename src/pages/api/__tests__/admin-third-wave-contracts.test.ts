import { beforeEach, describe, expect, it, vi } from 'vitest';

const recordRequestMock = vi.fn();
const getPlatformStatsMock = vi.fn();
const getTrendingPlacesByViewsMock = vi.fn();
const getSearchTrendsMock = vi.fn();
const getReleaseGateSummaryMock = vi.fn();
const getModerationStatsMock = vi.fn();
const getModerationQueueMock = vi.fn();
const getContentFlagsMock = vi.fn();
const reviewContentFlagMock = vi.fn();
const getReportsMock = vi.fn();
const updateReportStatusMock = vi.fn();
const takeModerationActionMock = vi.fn();
const getUserBanHistoryMock = vi.fn();
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

vi.mock('../../../lib/analytics', () => ({
  getPlatformStats: getPlatformStatsMock,
  getTrendingPlacesByViews: getTrendingPlacesByViewsMock,
  getSearchTrends: getSearchTrendsMock,
}));

vi.mock('../../../lib/release-gate-summary', () => ({
  getReleaseGateSummary: getReleaseGateSummaryMock,
}));

vi.mock('../../../lib/moderation', () => ({
  getModerationStats: getModerationStatsMock,
  getModerationQueue: getModerationQueueMock,
  getReports: getReportsMock,
  updateReportStatus: updateReportStatusMock,
  takeModerationAction: takeModerationActionMock,
  getUserBanHistory: getUserBanHistoryMock,
}));

vi.mock('../../../lib/admin-moderation', () => ({
  getContentFlags: getContentFlagsMock,
  reviewContentFlag: reviewContentFlagMock,
}));

vi.mock('../../../lib/validation', () => ({
  validateWithSchema: validateWithSchemaMock,
}));

vi.mock('../../../lib/logging', () => ({
  logger: loggerMock,
}));

describe('admin third wave contracts', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.resetAllMocks();

    getPlatformStatsMock.mockResolvedValue({
      totalSessions: 125,
      uniqueUsers: 42,
      totalTimeSpent: 7200,
      uniquePages: 18,
      uniqueSearches: 14,
      avgSessionDuration: 58,
      totalConversions: 6,
      period: 30,
    });
    getTrendingPlacesByViewsMock.mockResolvedValue([
      {
        id: 'place-1',
        name: 'Balikligol',
        category: 'historic',
        totalViews: 90,
        totalClicks: 32,
        totalLikes: 18,
        totalShares: 5,
        avgRating: 4.8,
        reviewCount: 11,
      },
    ]);
    getSearchTrendsMock.mockResolvedValue([
      { query: 'balikligol', count: 20, avgResults: 7 },
    ]);
    getReleaseGateSummaryMock.mockResolvedValue({
      available: true,
      generatedAt: '2026-04-16T00:00:00.000Z',
      finalStatus: 'passed',
      blockingFailedSteps: [],
      advisoryFailedSteps: [],
      failedStepCount: 0,
      steps: [],
      performanceOptimization: null,
    });
    getModerationStatsMock.mockResolvedValue({
      pending_reports: 3,
      in_review_reports: 2,
      resolved_reports: 7,
      active_bans: 1,
      total_warnings: 4,
      queue_items: 5,
    });
    getModerationQueueMock.mockResolvedValue([
      { id: 'queue-1', status: 'pending', priority: 'urgent' },
    ]);
    getContentFlagsMock.mockResolvedValue([
      {
        id: 'flag-1',
        content_type: 'review',
        content_id: 'review-1',
        flagged_by_user_id: 'user-1',
        flag_reason: 'spam',
        flag_description: 'Tekrarlayan spam',
        flag_severity: 'high',
        status: 'pending',
        reviewed_by_admin_id: null,
        review_notes: null,
        created_at: '2026-04-16T00:00:00.000Z',
        reporter_email: 'reporter@example.com',
        reviewer_email: null,
      },
    ]);
    reviewContentFlagMock.mockResolvedValue(undefined);
    getReportsMock.mockResolvedValue([
      {
        id: 'report-1',
        reporter_id: 'user-2',
        reported_user_id: 'user-3',
        content_type: 'review',
        content_id: 'review-9',
        reason: 'spam',
        description: 'Spam içerik',
        status: 'pending',
        resolved_by: null,
        resolution_note: null,
        created_at: '2026-04-16T00:00:00.000Z',
        updated_at: '2026-04-16T00:00:00.000Z',
        resolved_at: null,
      },
    ]);
    updateReportStatusMock.mockResolvedValue({
      id: 'report-1',
      reporter_id: 'user-2',
      reported_user_id: 'user-3',
      content_type: 'review',
      content_id: 'review-9',
      reason: 'spam',
      description: 'Spam içerik',
      status: 'resolved',
      resolved_by: 'admin-1',
      resolution_note: 'İşlendi',
      created_at: '2026-04-16T00:00:00.000Z',
      updated_at: '2026-04-16T00:00:00.000Z',
      resolved_at: '2026-04-16T00:00:00.000Z',
    });
    takeModerationActionMock.mockResolvedValue({
      id: 'action-1',
      report_id: 'report-1',
      target_user_id: 'user-3',
      action_type: 'warning',
      reason: 'Spam',
      duration_days: null,
      created_by: 'admin-1',
      expires_at: null,
      created_at: '2026-04-16T00:00:00.000Z',
    });
    getUserBanHistoryMock.mockResolvedValue([
      {
        id: 'ban-1',
        user_id: 'user-3',
        banned_by: 'admin-1',
        reason: 'Spam',
        duration_days: 7,
        appeal_reason: null,
        appeal_status: null,
        expires_at: '2026-04-23T00:00:00.000Z',
        created_at: '2026-04-16T00:00:00.000Z',
        is_active: true,
      },
    ]);
    validateWithSchemaMock.mockImplementation((body: any, schema: any) => {
      if (schema?.report_id && !body.report_id) {
        return { valid: false, data: body, errors: [{ field: 'report_id', message: 'required' }] };
      }
      if (schema?.status && !body.status) {
        return { valid: false, data: body, errors: [{ field: 'status', message: 'required' }] };
      }
      return { valid: true, data: body, errors: [] };
    });
  });

  it('rejects unauthorized analytics access', async () => {
    const { GET } = await import('../admin/analytics.ts');
    const request = new Request('https://example.com/api/admin/analytics?days=30&limit=10');
    const response = await GET({ request, locals: {} } as any);

    expect(response.status).toBe(403);
  });

  it('returns analytics snapshot for admins', async () => {
    const { GET } = await import('../admin/analytics.ts');
    const request = new Request('https://example.com/api/admin/analytics?days=30&limit=10');
    const response = await GET({
      request,
      locals: { user: { id: 'admin-1', role: 'admin' } },
    } as any);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.success).toBe(true);
    expect(body.data.data.platformStats.totalSessions).toBe(125);
    expect(body.data.data.trendingPlaces[0].totalViews).toBe(90);
  });

  it('returns release gate summary for admins', async () => {
    const { GET } = await import('../admin/system/release-gate-summary.ts');
    const request = new Request('https://example.com/api/admin/system/release-gate-summary');
    const response = await GET({
      request,
      locals: { user: { id: 'admin-1', role: 'admin' } },
    } as any);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.success).toBe(true);
    expect(body.data.data.finalStatus).toBe('passed');
  });

  it('returns moderation stats and queue preview', async () => {
    const { GET } = await import('../admin/moderation/stats.ts');
    const request = new Request('https://example.com/api/admin/moderation/stats');
    const response = await GET({
      request,
      locals: { user: { id: 'admin-1', role: 'admin' } },
    } as any);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.data.stats.pending_reports).toBe(3);
    expect(body.data.data.queue_preview).toHaveLength(1);
  });

  it('lists moderation flags for admins', async () => {
    const { GET } = await import('../admin/moderation/flags.ts');
    const request = new Request('https://example.com/api/admin/moderation/flags?status=pending&limit=20');
    const response = await GET({
      request,
      locals: { user: { id: 'admin-1', role: 'admin' } },
    } as any);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.data.flags).toHaveLength(1);
    expect(body.data.data.count).toBe(1);
  });

  it('reviews moderation flag via standardized write access', async () => {
    const { POST } = await import('../admin/moderation/flags.ts');
    const request = new Request('https://example.com/api/admin/moderation/flags', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ flagId: 'flag-1', decision: 'approved', notes: 'Uygun bulundu' }),
    });

    const response = await POST({
      request,
      locals: { user: { id: 'admin-1', role: 'admin' } },
    } as any);

    expect(response.status).toBe(200);
    expect(reviewContentFlagMock).toHaveBeenCalledWith('flag-1', 'admin-1', 'approved', 'Uygun bulundu');
  });

  it('creates moderation action for admins', async () => {
    const { POST } = await import('../admin/moderation/actions.ts');
    const request = new Request('https://example.com/api/admin/moderation/actions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        report_id: 'report-1',
        target_user_id: 'user-3',
        action_type: 'warning',
        reason: 'Spam',
      }),
    });

    const response = await POST({
      request,
      locals: { user: { id: 'admin-1', role: 'admin' } },
    } as any);

    expect(response.status).toBe(201);
    expect(takeModerationActionMock).toHaveBeenCalledWith(
      'report-1',
      'user-3',
      'warning',
      'Spam',
      'admin-1',
      undefined
    );
  });

  it('returns moderation action history for admins', async () => {
    const { GET } = await import('../admin/moderation/actions.ts');
    const request = new Request('https://example.com/api/admin/moderation/actions?user_id=user-3');
    const response = await GET({
      request,
      locals: { user: { id: 'admin-1', role: 'admin' } },
      url: new URL(request.url),
    } as any);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.count).toBe(1);
    expect(body.data.data[0].user_id).toBe('user-3');
  });

  it('lists moderation reports for admins', async () => {
    const { GET } = await import('../admin/moderation/reports.ts');
    const request = new Request('https://example.com/api/admin/moderation/reports?status=pending&limit=50');
    const response = await GET({
      request,
      locals: { user: { id: 'admin-1', role: 'admin' } },
      url: new URL(request.url),
    } as any);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.count).toBe(1);
    expect(body.data.data[0].id).toBe('report-1');
  });

  it('updates moderation report status for admins', async () => {
    const { PUT } = await import('../admin/moderation/reports.ts');
    const request = new Request('https://example.com/api/admin/moderation/reports?id=report-1', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'resolved', resolution_note: 'İşlendi' }),
    });

    const response = await PUT({
      request,
      locals: { user: { id: 'admin-1', role: 'admin' } },
      url: new URL(request.url),
    } as any);

    expect(response.status).toBe(200);
    expect(updateReportStatusMock).toHaveBeenCalledWith('report-1', 'resolved', 'admin-1', 'İşlendi');
  });
});
