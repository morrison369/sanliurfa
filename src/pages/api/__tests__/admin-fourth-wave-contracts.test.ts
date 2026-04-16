import { beforeEach, describe, expect, it, vi } from 'vitest';

const recordRequestMock = vi.fn();
const getPendingVendorVerificationsMock = vi.fn();
const getCacheMock = vi.fn();
const setCacheMock = vi.fn();
const deleteCacheMock = vi.fn();
const deleteCachePatternMock = vi.fn();
const queryRowsMock = vi.fn();
const insertMock = vi.fn();
const queryOneMock = vi.fn();
const awardPointsMock = vi.fn();
const awardBadgeToUserMock = vi.fn();
const awardBadgeMock = vi.fn();
const validateWithSchemaMock = vi.fn();
const getAllGuidelinesMock = vi.fn();
const getGuidelinesByCategoryMock = vi.fn();
const getUnimplementedGuidelinesMock = vi.fn();
const calculateSecurityScoreMock = vi.fn();
const getCriticalItemsMock = vi.fn();
const getBackupConfigsMock = vi.fn();
const updateBackupConfigMock = vi.fn();
const simulateBackupMock = vi.fn();

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

vi.mock('../../../lib/vendor-onboarding', () => ({
  getPendingVerifications: getPendingVendorVerificationsMock,
}));

vi.mock('../../../lib/cache', () => ({
  getCache: getCacheMock,
  setCache: setCacheMock,
  deleteCache: deleteCacheMock,
  deleteCachePattern: deleteCachePatternMock,
}));

vi.mock('../../../lib/postgres', () => ({
  queryRows: queryRowsMock,
  insert: insertMock,
  queryOne: queryOneMock,
}));

vi.mock('../../../lib/loyalty-points', () => ({
  awardPoints: awardPointsMock,
}));

vi.mock('../../../lib/badges', () => ({
  awardBadgeToUser: awardBadgeToUserMock,
}));

vi.mock('../../../lib/place-verification', () => ({
  awardBadge: awardBadgeMock,
}));

vi.mock('../../../lib/validation', () => ({
  validateWithSchema: validateWithSchemaMock,
}));

vi.mock('../../../lib/security-guidelines', () => ({
  getAllGuidelines: getAllGuidelinesMock,
  getGuidelinesByCategory: getGuidelinesByCategoryMock,
  getUnimplementedGuidelines: getUnimplementedGuidelinesMock,
  calculateSecurityScore: calculateSecurityScoreMock,
  getCriticalItems: getCriticalItemsMock,
}));

vi.mock('../../../lib/deployment', () => ({
  getBackupConfigs: getBackupConfigsMock,
  updateBackupConfig: updateBackupConfigMock,
  simulateBackup: simulateBackupMock,
}));

vi.mock('../../../lib/logging', () => ({
  logger: loggerMock,
}));

describe('admin fourth wave contracts', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.resetAllMocks();

    getPendingVendorVerificationsMock.mockResolvedValue([
      { id: 'vendor-1', business_name: 'Urfa Kebap', verification_status: 'pending' },
    ]);
    getCacheMock.mockResolvedValue(null);
    setCacheMock.mockResolvedValue(undefined);
    deleteCacheMock.mockResolvedValue(undefined);
    deleteCachePatternMock.mockResolvedValue(undefined);
    queryRowsMock.mockResolvedValue([
      {
        id: 'reward-1',
        reward_name: 'Ücretsiz Kahve',
        description: 'Sadakat ödülü',
        category: 'food',
        points_cost: 120,
        tier_requirement: null,
        is_active: true,
        display_order: 1,
      },
    ]);
    insertMock.mockResolvedValue({
      id: 'reward-1',
      reward_name: 'Ücretsiz Kahve',
      description: 'Sadakat ödülü',
      category: 'food',
      points_cost: 120,
      tier_requirement: null,
      is_active: true,
      display_order: 999,
    });
    queryOneMock.mockResolvedValue({ id: 'entity-1' });
    awardPointsMock.mockResolvedValue(true);
    awardBadgeToUserMock.mockResolvedValue(true);
    awardBadgeMock.mockResolvedValue({
      id: 'badge-1',
      placeId: '12345678-1234-1234-1234-123456789012',
      badgeType: 'featured',
      badgeName: 'Featured',
      icon: 'star',
    });
    validateWithSchemaMock.mockImplementation((body: Record<string, unknown>) => ({
      valid: true,
      data: body,
      errors: [],
    }));
    getAllGuidelinesMock.mockReturnValue([{ id: 'g-1', category: 'headers', implemented: true }]);
    getGuidelinesByCategoryMock.mockReturnValue([{ id: 'g-2', category: 'headers', implemented: true }]);
    getUnimplementedGuidelinesMock.mockReturnValue([{ id: 'g-3', category: 'tls', implemented: false }]);
    getCriticalItemsMock.mockReturnValue([{ id: 'g-4', category: 'auth', implemented: false }]);
    calculateSecurityScoreMock.mockReturnValue({ score: 88, implemented: 22, total: 25 });
    getBackupConfigsMock.mockReturnValue([
      {
        id: 'backup-1',
        enabled: true,
        schedule: 'daily',
        retention_days: 14,
        destination: 'local',
      },
    ]);
    updateBackupConfigMock.mockReturnValue({
      id: 'backup-1',
      enabled: false,
      schedule: 'weekly',
      retention_days: 30,
      destination: 's3',
    });
    simulateBackupMock.mockResolvedValue({
      status: 'completed',
      started_at: '2026-04-16T00:00:00.000Z',
      completed_at: '2026-04-16T00:10:00.000Z',
      size_bytes: 1024,
      duration_seconds: 600,
    });
  });

  it('rejects unauthorized vendor pending access', async () => {
    const { GET } = await import('../admin/vendor/pending.ts');
    const request = new Request('https://example.com/api/admin/vendor/pending');
    const response = await GET({ request, locals: {} } as any);

    expect(response.status).toBe(403);
  });

  it('returns pending vendors for admins', async () => {
    const { GET } = await import('../admin/vendor/pending.ts');
    const request = new Request('https://example.com/api/admin/vendor/pending');
    const response = await GET({
      request,
      locals: { isAdmin: true, user: { id: 'admin-1', role: 'admin' } },
    } as any);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.data.count).toBe(1);
    expect(body.data.data.pending[0].id).toBe('vendor-1');
  });

  it('returns loyalty rewards list for admins', async () => {
    const { GET } = await import('../admin/loyalty/rewards.ts');
    const request = new Request('https://example.com/api/admin/loyalty/rewards');
    const response = await GET({
      request,
      locals: { user: { id: 'admin-1', role: 'admin' } },
    } as any);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.success).toBe(true);
    expect(body.data.data[0].reward_name).toBe('Ücretsiz Kahve');
  });

  it('creates loyalty reward for admins', async () => {
    const { POST } = await import('../admin/loyalty/rewards.ts');
    const request = new Request('https://example.com/api/admin/loyalty/rewards', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        reward_name: 'Ücretsiz Kahve',
        category: 'food',
        points_cost: 120,
        stock_quantity: 10,
      }),
    });

    const response = await POST({
      request,
      locals: { user: { id: 'admin-1', role: 'admin' } },
    } as any);

    expect(response.status).toBe(201);
    expect(deleteCacheMock).toHaveBeenCalledWith('sanliurfa:admin:rewards:catalog');
  });

  it('awards loyalty points for admins', async () => {
    const { POST } = await import('../admin/loyalty/award.ts');
    const request = new Request('https://example.com/api/admin/loyalty/award', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        userId: 'user-1',
        type: 'points',
        amount: 50,
        reason: 'Manuel bonus',
      }),
    });

    const response = await POST({
      request,
      locals: { user: { id: 'admin-1', role: 'admin' } },
    } as any);

    expect(response.status).toBe(200);
    expect(awardPointsMock).toHaveBeenCalledWith('user-1', 50, 'Manuel bonus', 'admin_award', expect.any(String));
  });

  it('awards place badge for admins', async () => {
    const { POST } = await import('../admin/badges/award.ts');
    const request = new Request('https://example.com/api/admin/badges/award', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        placeId: '12345678-1234-1234-1234-123456789012',
        badgeType: 'featured',
        reason: 'Kalite onayı',
      }),
    });

    const response = await POST({
      request,
      locals: { isAdmin: true, user: { id: 'admin-1', role: 'admin' } },
    } as any);

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.data.success).toBe(true);
    expect(body.data.badge.id).toBe('badge-1');
  });

  it('returns security guideline snapshot for admins', async () => {
    const { GET } = await import('../admin/security/guidelines.ts');
    const request = new Request('https://example.com/api/admin/security/guidelines?filter=critical');
    const response = await GET({
      request,
      locals: { isAdmin: true, user: { id: 'admin-1', role: 'admin' } },
      url: new URL(request.url),
    } as any);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.data.score.score).toBe(88);
  });

  it('lists backup configs for admins', async () => {
    const { GET } = await import('../admin/deployment/backup.ts');
    const request = new Request('https://example.com/api/admin/deployment/backup');
    const response = await GET({
      request,
      locals: { isAdmin: true, user: { id: 'admin-1', role: 'admin' } },
    } as any);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.data.count).toBe(1);
    expect(body.data.data.backups[0].id).toBe('backup-1');
  });

  it('updates backup config for admins', async () => {
    const { PUT } = await import('../admin/deployment/backup.ts');
    const request = new Request('https://example.com/api/admin/deployment/backup?id=backup-1', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        enabled: false,
        schedule: 'weekly',
        retention_days: 30,
        destination: 's3',
      }),
    });

    const response = await PUT({
      request,
      locals: { isAdmin: true, user: { id: 'admin-1', role: 'admin' } },
      url: new URL(request.url),
    } as any);

    expect(response.status).toBe(200);
    expect(updateBackupConfigMock).toHaveBeenCalledWith('backup-1', {
      enabled: false,
      schedule: 'weekly',
      retention_days: 30,
      destination: 's3',
    });
  });

  it('triggers backup for admins', async () => {
    const { POST } = await import('../admin/deployment/backup.ts');
    const request = new Request('https://example.com/api/admin/deployment/backup?id=backup-1', {
      method: 'POST',
    });

    const response = await POST({
      request,
      locals: { isAdmin: true, user: { id: 'admin-1', role: 'admin' } },
      url: new URL(request.url),
    } as any);

    expect(response.status).toBe(200);
    expect(simulateBackupMock).toHaveBeenCalledWith('backup-1');
  });
});
