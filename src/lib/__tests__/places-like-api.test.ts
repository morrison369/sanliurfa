import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApiContext, expectApiErrorCode, parseJson } from './helpers/api-test-helpers';

const {
  likePlaceMock,
  unlikePlaceMock,
  hasUserLikedPlaceMock,
  getPlaceLikeCountMock,
  deleteCachePatternMock,
  loggerErrorMock,
  loggerInfoMock,
  loggerSetRequestIdMock,
} = vi.hoisted(() => ({
  likePlaceMock: vi.fn(),
  unlikePlaceMock: vi.fn(),
  hasUserLikedPlaceMock: vi.fn(),
  getPlaceLikeCountMock: vi.fn(),
  deleteCachePatternMock: vi.fn(),
  loggerErrorMock: vi.fn(),
  loggerInfoMock: vi.fn(),
  loggerSetRequestIdMock: vi.fn(),
}));

vi.mock('../social/social-interactions', () => ({
  likePlace: likePlaceMock,
  unlikePlace: unlikePlaceMock,
  hasUserLikedPlace: hasUserLikedPlaceMock,
  getPlaceLikeCount: getPlaceLikeCountMock,
}));

vi.mock('../metrics', () => ({
  recordRequest: vi.fn(),
}));

vi.mock('../cache', () => ({
  deleteCachePattern: deleteCachePatternMock,
}));

vi.mock('../logging', () => ({
  logger: {
    setRequestId: loggerSetRequestIdMock,
    error: loggerErrorMock,
    info: loggerInfoMock,
  },
}));

import { GET, POST } from '../../pages/api/places/[id]/like';

describe('places like api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    deleteCachePatternMock.mockResolvedValue(undefined);
  });

  it('POST returns 401 when user is not authenticated', async () => {
    const response = await POST(
      createApiContext({
        url: 'http://localhost/api/places/1/like',
        method: 'POST',
        body: { action: 'like' },
        params: { id: '1' },
        locals: {},
      })
    );
    const body = await parseJson(response);

    expect(response.status).toBe(401);
    expectApiErrorCode(body, 'UNAUTHORIZED');
  });

  it('POST returns updated count on success', async () => {
    likePlaceMock.mockResolvedValueOnce(true);
    getPlaceLikeCountMock.mockResolvedValueOnce(7);

    const response = await POST(
      createApiContext({
        url: 'http://localhost/api/places/1/like',
        method: 'POST',
        body: { action: 'like' },
        params: { id: '1' },
        locals: { user: { id: 'u1' } },
      })
    );
    const body = await parseJson(response);

    expect(response.status).toBe(200);
    expect(body?.data?.success).toBe(true);
    expect(body?.data?.data?.count).toBe(7);
  });

  it('POST uses unlike flow when action=unlike', async () => {
    unlikePlaceMock.mockResolvedValueOnce(true);
    getPlaceLikeCountMock.mockResolvedValueOnce(6);

    const response = await POST(
      createApiContext({
        url: 'http://localhost/api/places/1/like',
        method: 'POST',
        body: { action: 'unlike' },
        params: { id: '1' },
        locals: { user: { id: 'u1' } },
      })
    );
    const body = await parseJson(response);

    expect(response.status).toBe(200);
    expect(body?.data?.data?.count).toBe(6);
    expect(unlikePlaceMock).toHaveBeenCalledWith('1', 'u1');
  });

  it('POST returns 400 when action is invalid', async () => {
    const response = await POST(
      createApiContext({
        url: 'http://localhost/api/places/1/like',
        method: 'POST',
        body: { action: 'toggle' },
        params: { id: '1' },
        locals: { user: { id: 'u1' } },
      })
    );
    const body = await parseJson(response);

    expect(response.status).toBe(400);
    expectApiErrorCode(body, 'VALIDATION_ERROR');
  });

  it('POST returns 400 when place id is missing', async () => {
    const response = await POST(
      createApiContext({
        url: 'http://localhost/api/places//like',
        method: 'POST',
        body: { action: 'like' },
        params: {},
        locals: { user: { id: 'u1' } },
      })
    );
    const body = await parseJson(response);

    expect(response.status).toBe(400);
    expectApiErrorCode(body, 'VALIDATION_ERROR');
  });

  it('POST returns 500 when like flow throws', async () => {
    likePlaceMock.mockRejectedValueOnce(new Error('db down'));

    const response = await POST(
      createApiContext({
        url: 'http://localhost/api/places/1/like',
        method: 'POST',
        body: { action: 'like' },
        params: { id: '1' },
        locals: { user: { id: 'u1' } },
      })
    );
    const body = await parseJson(response);

    expect(response.status).toBe(500);
    expectApiErrorCode(body, 'INTERNAL_ERROR');
  });

  it('GET returns like stats for authenticated user', async () => {
    getPlaceLikeCountMock.mockResolvedValueOnce(9);
    hasUserLikedPlaceMock.mockResolvedValueOnce(true);

    const response = await GET(
      createApiContext({
        url: 'http://localhost/api/places/1/like',
        params: { id: '1' },
        locals: { user: { id: 'u1' } },
      })
    );
    const body = await parseJson(response);

    expect(response.status).toBe(200);
    expect(body?.data?.success).toBe(true);
    expect(body?.data?.data?.count).toBe(9);
    expect(body?.data?.data?.hasLiked).toBe(true);
  });

  it('GET returns 400 when place id is missing', async () => {
    const response = await GET(
      createApiContext({
        url: 'http://localhost/api/places//like',
        params: {},
        locals: { user: { id: 'u1' } },
      })
    );
    const body = await parseJson(response);

    expect(response.status).toBe(400);
    expectApiErrorCode(body, 'VALIDATION_ERROR');
  });

  it('GET returns hasLiked=false when unauthenticated', async () => {
    getPlaceLikeCountMock.mockResolvedValueOnce(3);

    const response = await GET(
      createApiContext({
        url: 'http://localhost/api/places/1/like',
        params: { id: '1' },
        locals: {},
      })
    );
    const body = await parseJson(response);

    expect(response.status).toBe(200);
    expect(body?.data?.data?.hasLiked).toBe(false);
  });

  it('GET returns 500 when like count lookup fails', async () => {
    getPlaceLikeCountMock.mockRejectedValueOnce(new Error('redis down'));

    const response = await GET(
      createApiContext({
        url: 'http://localhost/api/places/1/like',
        params: { id: '1' },
        locals: { user: { id: 'u1' } },
      })
    );
    const body = await parseJson(response);

    expect(response.status).toBe(500);
    expectApiErrorCode(body, 'INTERNAL_ERROR');
  });
});
