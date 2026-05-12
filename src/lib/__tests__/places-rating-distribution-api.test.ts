import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApiContext, expectApiErrorCode, parseJson } from './helpers/api-test-helpers';

const { queryOneMock, getCacheMock, setCacheMock, loggerErrorMock, loggerSetRequestIdMock } = vi.hoisted(() => ({
  queryOneMock: vi.fn(),
  getCacheMock: vi.fn(),
  setCacheMock: vi.fn(),
  loggerErrorMock: vi.fn(),
  loggerSetRequestIdMock: vi.fn(),
}));

vi.mock('../postgres', () => ({ queryOne: queryOneMock }));
vi.mock('../cache', () => ({ getCache: getCacheMock, setCache: setCacheMock }));
vi.mock('../metrics', () => ({ recordRequest: vi.fn() }));
vi.mock('../logging', () => ({
  logger: { setRequestId: loggerSetRequestIdMock, error: loggerErrorMock },
}));

import { GET } from '../../pages/api/places/[id]/rating-distribution';

describe('places rating distribution api', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns cached distribution when cache hit', async () => {
    getCacheMock.mockResolvedValueOnce({ total_reviews: 12, average_rating: 4.6 });
    const response = await GET(
      createApiContext({
        url: 'http://localhost/api/places/1/rating-distribution',
        params: { id: '1' },
      })
    );
    const body = await parseJson(response);
    expect(response.status).toBe(200);
    expect(body?.data?.success).toBe(true);
    expect(body?.data?.data?.total_reviews).toBe(12);
  });

  it('returns computed distribution when cache miss', async () => {
    getCacheMock.mockResolvedValueOnce(null);
    queryOneMock.mockResolvedValueOnce({
      five_stars: '5',
      four_stars: '3',
      three_stars: '1',
      two_stars: '0',
      one_stars: '1',
      total_reviews: '10',
      average_rating: '4.1',
    });

    const response = await GET(
      createApiContext({
        url: 'http://localhost/api/places/1/rating-distribution',
        params: { id: '1' },
      })
    );
    const body = await parseJson(response);

    expect(response.status).toBe(200);
    expect(body?.data?.data?.five_stars).toBe(5);
    expect(setCacheMock).toHaveBeenCalled();
  });

  it('returns 500 when data query fails', async () => {
    getCacheMock.mockResolvedValueOnce(null);
    queryOneMock.mockRejectedValueOnce(new Error('db-fail'));

    const response = await GET(
      createApiContext({
        url: 'http://localhost/api/places/1/rating-distribution',
        params: { id: '1' },
      })
    );
    const body = await parseJson(response);

    expect(response.status).toBe(500);
    expectApiErrorCode(body, 'INTERNAL_ERROR');
  });
});
