import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApiContext, parseJson } from './helpers/api-test-helpers';

const { requireAuthMock, getSocialFeatureConfigMock, getSwipeQuotaMock } = vi.hoisted(() => ({
  requireAuthMock: vi.fn(),
  getSocialFeatureConfigMock: vi.fn(),
  getSwipeQuotaMock: vi.fn(),
}));

vi.mock('../auth', () => ({
  requireAuth: requireAuthMock,
}));

vi.mock('../social/match-features', () => ({
  getSocialFeatureConfig: getSocialFeatureConfigMock,
}));

vi.mock('../social/matchmaking-db', () => ({
  getSwipeQuota: getSwipeQuotaMock,
}));

import { GET } from '../../pages/api/social/capabilities';

describe('social capabilities api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when user is not authenticated', async () => {
    requireAuthMock.mockResolvedValueOnce({ user: null });

    const response = await GET(createApiContext({ url: 'http://localhost/api/social/capabilities' }));
    const body = await parseJson(response);

    expect(response.status).toBe(401);
    expect(body?.title || body?.error).toBe('Unauthorized');
  });

  it('returns capabilities payload for authenticated user', async () => {
    requireAuthMock.mockResolvedValueOnce({ user: { id: 'user-1' } });
    getSocialFeatureConfigMock.mockReturnValueOnce({
      openAccess: true,
      tinderEnabled: true,
      autoConversationOnMatch: true,
      dailySwipeLimit: 100,
    });
    getSwipeQuotaMock.mockResolvedValueOnce({
      dailyLimit: 100,
      usedToday: 12,
      remaining: 88,
    });

    const response = await GET(createApiContext({ url: 'http://localhost/api/social/capabilities' }));
    const body = await parseJson(response);

    expect(response.status).toBe(200);
    expect(body?.success).toBe(true);
    expect(body?.data?.features?.openAccess).toBe(true);
    expect(body?.data?.quota?.usedToday).toBe(12);
    expect(body?.data?.premiumRequired).toBe(false);
  });
});
