import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApiContext, expectApiErrorCode, parseJson } from './helpers/api-test-helpers';

const { queryOneMock, getPlaceFollowersMock, loggerErrorMock, loggerSetRequestIdMock } = vi.hoisted(() => ({
  queryOneMock: vi.fn(),
  getPlaceFollowersMock: vi.fn(),
  loggerErrorMock: vi.fn(),
  loggerSetRequestIdMock: vi.fn(),
}));

vi.mock('../postgres', () => ({
  queryOne: queryOneMock,
}));

vi.mock('../place/place-followers', () => ({
  getPlaceFollowers: getPlaceFollowersMock,
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

import { GET } from '../../pages/api/places/[id]/followers';

describe('places followers api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 404 when place is missing', async () => {
    queryOneMock.mockResolvedValueOnce(null);

    const response = await GET(
      createApiContext({
        url: 'http://localhost/api/places/1/followers',
        params: { id: '1' },
      })
    );
    const body = await parseJson(response);

    expect(response.status).toBe(404);
    expectApiErrorCode(body, 'NOT_FOUND');
  });

  it('returns followers on success', async () => {
    queryOneMock.mockResolvedValueOnce({ id: '1' });
    getPlaceFollowersMock.mockResolvedValueOnce([{ id: 'u1' }, { id: 'u2' }]);

    const response = await GET(
      createApiContext({
        url: 'http://localhost/api/places/1/followers?limit=10',
        params: { id: '1' },
      })
    );
    const body = await parseJson(response);

    expect(response.status).toBe(200);
    expect(body?.data?.success).toBe(true);
    expect(body?.data?.count).toBe(2);
  });

  it('returns 500 when service throws', async () => {
    queryOneMock.mockResolvedValueOnce({ id: '1' });
    getPlaceFollowersMock.mockRejectedValueOnce(new Error('boom'));

    const response = await GET(
      createApiContext({
        url: 'http://localhost/api/places/1/followers',
        params: { id: '1' },
      })
    );
    const body = await parseJson(response);

    expect(response.status).toBe(500);
    expectApiErrorCode(body, 'INTERNAL_ERROR');
    expect(loggerErrorMock).toHaveBeenCalled();
  });
});
