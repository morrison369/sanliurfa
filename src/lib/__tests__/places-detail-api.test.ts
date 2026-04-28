import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApiContext, expectApiErrorCode, parseJson } from './helpers/api-test-helpers';

const {
  queryOneMock,
  resolveContentImageMock,
  recordRequestMock,
  loggerSetRequestIdMock,
  loggerErrorMock,
} = vi.hoisted(() => ({
  queryOneMock: vi.fn(),
  resolveContentImageMock: vi.fn(),
  recordRequestMock: vi.fn(),
  loggerSetRequestIdMock: vi.fn(),
  loggerErrorMock: vi.fn(),
}));

vi.mock('../postgres', () => ({
  queryOne: queryOneMock,
}));

vi.mock('../content-images', () => ({
  resolveContentImage: resolveContentImageMock,
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

import { GET } from '../../pages/api/places/[id]/index';

describe('places detail api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 when id is missing', async () => {
    const response = await GET(
      createApiContext({
        url: 'http://localhost/api/places',
        params: {},
      })
    );
    const body = await parseJson(response);

    expect(response.status).toBe(400);
    expectApiErrorCode(body, 'VALIDATION_ERROR');
  });

  it('returns 404 when place is not found', async () => {
    queryOneMock.mockResolvedValueOnce(null);

    const response = await GET(
      createApiContext({
        url: 'http://localhost/api/places/place-1',
        params: { id: 'place-1' },
      })
    );
    const body = await parseJson(response);

    expect(response.status).toBe(404);
    expectApiErrorCode(body, 'NOT_FOUND');
    expect(queryOneMock).toHaveBeenCalledTimes(1);
  });

  it('returns normalized place detail payload on success', async () => {
    queryOneMock.mockResolvedValueOnce({
      id: 'place-1',
      slug: 'gobeklitepe',
      name: 'Göbeklitepe',
      category: 'tarihi-yerler',
      thumbnail_url: null,
      status: 'active',
    });

    resolveContentImageMock
      .mockReturnValueOnce('/images/places/gobeklitepe.jpg')
      .mockReturnValueOnce('/images/places/gobeklitepe-thumb.jpg');

    const response = await GET(
      createApiContext({
        url: 'http://localhost/api/places/place-1',
        params: { id: 'place-1' },
      })
    );
    const body = await parseJson(response);

    expect(response.status).toBe(200);
    expect(body?.data?.success).toBe(true);
    expect(body?.data?.data?.slug).toBe('gobeklitepe');
    expect(body?.data?.data?.image_url).toBe('/images/places/gobeklitepe.jpg');
    expect(body?.data?.data?.thumbnail_url).toBe('/images/places/gobeklitepe-thumb.jpg');
    expect(resolveContentImageMock).toHaveBeenCalledTimes(2);
  });

  it('returns 500 when query fails', async () => {
    queryOneMock.mockRejectedValueOnce(new Error('db failed'));

    const response = await GET(
      createApiContext({
        url: 'http://localhost/api/places/place-1',
        params: { id: 'place-1' },
      })
    );
    const body = await parseJson(response);

    expect(response.status).toBe(500);
    expectApiErrorCode(body, 'INTERNAL_ERROR');
    expect(loggerErrorMock).toHaveBeenCalled();
  });
});
