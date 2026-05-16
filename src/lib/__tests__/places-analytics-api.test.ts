import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApiContext, expectApiErrorCode, parseJson } from './helpers/api-test-helpers';

const { queryOneMock, getPlaceAnalyticsMock, loggerErrorMock, loggerSetRequestIdMock } = vi.hoisted(() => ({
  queryOneMock: vi.fn(),
  getPlaceAnalyticsMock: vi.fn(),
  loggerErrorMock: vi.fn(),
  loggerSetRequestIdMock: vi.fn(),
}));

vi.mock('../postgres', () => ({
  queryOne: queryOneMock,
}));

vi.mock('../analytics', () => ({
  getPlaceAnalytics: getPlaceAnalyticsMock,
}));

vi.mock('../metrics', () => ({
  recordRequest: vi.fn(),
}));

vi.mock('../logging', () => ({
  logger: {
    setRequestId: loggerSetRequestIdMock,
    error: loggerErrorMock,
  },
}));

import { GET } from '../../pages/api/places/[id]/analytics';

describe('places analytics api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 404 when place does not exist', async () => {
    queryOneMock.mockResolvedValueOnce(null);

    const response = await GET(
      createApiContext({
        url: 'http://localhost/api/places/1/analytics',
        params: { id: '1' },
        locals: { user: { id: 'u1', role: 'admin' } },
      })
    );
    const body = await parseJson(response);

    expect(response.status).toBe(404);
    expectApiErrorCode(body, 'NOT_FOUND');
  });

  it('returns 403 when user is not owner and not admin', async () => {
    queryOneMock.mockResolvedValueOnce({ id: '1', owner_id: 'owner-1' });

    const response = await GET(
      createApiContext({
        url: 'http://localhost/api/places/1/analytics',
        params: { id: '1' },
        locals: { user: { id: 'u1', role: 'user' } },
      })
    );
    const body = await parseJson(response);

    expect(response.status).toBe(403);
    expectApiErrorCode(body, 'FORBIDDEN');
  });

  it('returns analytics for owner/admin', async () => {
    queryOneMock.mockResolvedValueOnce({ id: '1', owner_id: 'u1' });
    getPlaceAnalyticsMock.mockResolvedValueOnce({ views: 120, clicks: 34 });

    const response = await GET(
      createApiContext({
        url: 'http://localhost/api/places/1/analytics?days=30',
        params: { id: '1' },
        locals: { user: { id: 'u1', role: 'user' } },
      })
    );
    const body = await parseJson(response);

    expect(response.status).toBe(200);
    expect(body?.data?.success).toBe(true);
    expect(body?.data?.period).toBe(30);
  });
});
