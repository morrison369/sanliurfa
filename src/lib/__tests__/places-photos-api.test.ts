import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApiContext, expectApiErrorCode, parseJson } from './helpers/api-test-helpers';

const { queryOneMock, getPlacePhotosMock, recordRequestMock, loggerErrorMock, loggerSetRequestIdMock } =
  vi.hoisted(() => ({
    queryOneMock: vi.fn(),
    getPlacePhotosMock: vi.fn(),
    recordRequestMock: vi.fn(),
    loggerErrorMock: vi.fn(),
    loggerSetRequestIdMock: vi.fn(),
  }));

vi.mock('../postgres', () => ({
  queryOne: queryOneMock,
}));

vi.mock('../photo', () => ({
  getPlacePhotos: getPlacePhotosMock,
}));

vi.mock('../metrics', () => ({
  recordRequest: recordRequestMock,
}));

vi.mock('../logging', () => ({
  logger: {
    setRequestId: loggerSetRequestIdMock,
    error: loggerErrorMock,
  },
}));

import { GET } from '../../pages/api/places/[id]/photos';

describe('places photos api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 404 when place is missing', async () => {
    queryOneMock.mockResolvedValueOnce(null);

    const response = await GET(
      createApiContext({
        url: 'http://localhost/api/places/1/photos',
        params: { id: '1' },
      })
    );
    const body = await parseJson(response);

    expect(response.status).toBe(404);
    expectApiErrorCode(body, 'NOT_FOUND');
  });

  it('returns photos list on success', async () => {
    queryOneMock.mockResolvedValueOnce({ id: '1' });
    getPlacePhotosMock.mockResolvedValueOnce([
      { id: 'p1', url: '/images/places/gobeklitepe.jpg' },
      { id: 'p2', url: '/images/places/gobeklitepe-2.jpg' },
    ]);

    const response = await GET(
      createApiContext({
        url: 'http://localhost/api/places/1/photos?limit=50',
        params: { id: '1' },
      })
    );
    const body = await parseJson(response);

    expect(response.status).toBe(200);
    expect(body?.data?.success).toBe(true);
    expect(body?.data?.count).toBe(2);
    expect(Array.isArray(body?.data?.data)).toBe(true);
  });

  it('returns 500 when service throws', async () => {
    queryOneMock.mockResolvedValueOnce({ id: '1' });
    getPlacePhotosMock.mockRejectedValueOnce(new Error('boom'));

    const response = await GET(
      createApiContext({
        url: 'http://localhost/api/places/1/photos',
        params: { id: '1' },
      })
    );
    const body = await parseJson(response);

    expect(response.status).toBe(500);
    expectApiErrorCode(body, 'INTERNAL_ERROR');
    expect(loggerErrorMock).toHaveBeenCalled();
  });
});
