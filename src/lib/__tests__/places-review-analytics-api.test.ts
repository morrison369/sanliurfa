import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApiContext, parseJson } from './helpers/api-test-helpers';

const {
  queryOneMock,
  getPlaceReviewSummaryMock,
  getTopReviewsForPlaceMock,
  loggerErrorMock,
  loggerSetRequestIdMock,
} = vi.hoisted(() => ({
  queryOneMock: vi.fn(),
  getPlaceReviewSummaryMock: vi.fn(),
  getTopReviewsForPlaceMock: vi.fn(),
  loggerErrorMock: vi.fn(),
  loggerSetRequestIdMock: vi.fn(),
}));

vi.mock('../postgres', () => ({ queryOne: queryOneMock }));
vi.mock('../review/review-management', () => ({
  getPlaceReviewSummary: getPlaceReviewSummaryMock,
  getTopReviewsForPlace: getTopReviewsForPlaceMock,
}));
vi.mock('../metrics', () => ({ recordRequest: vi.fn() }));
vi.mock('../logging', () => ({
  logger: { setRequestId: loggerSetRequestIdMock, error: loggerErrorMock },
}));

import { GET } from '../../pages/api/places/[id]/review-analytics';

describe('places review analytics api', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 for unauthenticated user', async () => {
    const response = await GET(
      createApiContext({
        url: 'http://localhost/api/places/1/review-analytics',
        locals: {},
        params: { id: '1' },
      })
    );
    expect(response.status).toBe(401);
  });

  it('returns 403 for non-owner', async () => {
    queryOneMock.mockResolvedValueOnce({ user_id: 'owner-1' });
    const response = await GET(
      createApiContext({
        url: 'http://localhost/api/places/1/review-analytics',
        locals: { user: { id: 'u1' } },
        params: { id: '1' },
      })
    );
    expect(response.status).toBe(403);
  });

  it('returns analytics for owner', async () => {
    queryOneMock.mockResolvedValueOnce({ user_id: 'u1' });
    getPlaceReviewSummaryMock.mockResolvedValueOnce({ total_reviews: 10 });
    getTopReviewsForPlaceMock.mockResolvedValueOnce([{ id: 'r1' }]);

    const response = await GET(
      createApiContext({
        url: 'http://localhost/api/places/1/review-analytics',
        locals: { user: { id: 'u1' } },
        params: { id: '1' },
      })
    );
    const body = await parseJson(response);

    expect(response.status).toBe(200);
    expect(body?.data?.success).toBe(true);
    expect(body?.data?.data?.summary?.total_reviews).toBe(10);
  });
});
