import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApiContext, expectApiErrorCode, parseJson } from './helpers/api-test-helpers';

const {
  getCacheMock,
  queryOneMock,
  getPlaceBadgesMock,
  loggerErrorMock,
  loggerSetRequestIdMock,
} = vi.hoisted(() => ({
  getCacheMock: vi.fn(),
  queryOneMock: vi.fn(),
  getPlaceBadgesMock: vi.fn(),
  loggerErrorMock: vi.fn(),
  loggerSetRequestIdMock: vi.fn(),
}));

vi.mock('../cache', () => ({
  getCache: getCacheMock,
  setCache: vi.fn(),
}));

vi.mock('../postgres', () => ({
  queryOne: queryOneMock,
}));

vi.mock('../place/place-verification', () => ({
  getPlaceBadges: getPlaceBadgesMock,
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

import { GET } from '../../pages/api/places/[id]/badges';

describe('places badges api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns cached badges when cache hit', async () => {
    getCacheMock.mockResolvedValueOnce([{ code: 'verified' }]);

    const response = await GET(
      createApiContext({
        url: 'http://localhost/api/places/1/badges',
        params: { id: '1' },
      })
    );
    const body = await parseJson(response);

    expect(response.status).toBe(200);
    expect(body?.data?.success).toBe(true);
    expect(Array.isArray(body?.data?.badges)).toBe(true);
    expect(queryOneMock).not.toHaveBeenCalled();
  });

  it('returns 404 when place does not exist', async () => {
    getCacheMock.mockResolvedValueOnce(null);
    queryOneMock.mockResolvedValueOnce(null);

    const response = await GET(
      createApiContext({
        url: 'http://localhost/api/places/1/badges',
        params: { id: '1' },
      })
    );
    const body = await parseJson(response);

    expect(response.status).toBe(404);
    expectApiErrorCode(body, 'NOT_FOUND');
  });

  it('returns badges from service', async () => {
    getCacheMock.mockResolvedValueOnce(null);
    queryOneMock.mockResolvedValueOnce({ id: '1' });
    getPlaceBadgesMock.mockResolvedValueOnce([{ code: 'popular' }]);

    const response = await GET(
      createApiContext({
        url: 'http://localhost/api/places/1/badges',
        params: { id: '1' },
      })
    );
    const body = await parseJson(response);

    expect(response.status).toBe(200);
    expect(body?.data?.success).toBe(true);
    expect(body?.data?.badges?.[0]?.code).toBe('popular');
  });
});
