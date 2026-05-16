import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApiContext, expectApiErrorCode, parseJson } from './helpers/api-test-helpers';

const {
  queryMock,
  queryOneMock,
  resolveContentImageMock,
  recordRequestMock,
  loggerSetRequestIdMock,
  loggerErrorMock,
  authenticateUserMock,
  deleteCachePatternMock,
} = vi.hoisted(() => ({
  queryMock: vi.fn(),
  queryOneMock: vi.fn(),
  resolveContentImageMock: vi.fn(),
  recordRequestMock: vi.fn(),
  loggerSetRequestIdMock: vi.fn(),
  loggerErrorMock: vi.fn(),
  authenticateUserMock: vi.fn(),
  deleteCachePatternMock: vi.fn(),
}));

vi.mock('../postgres', () => ({
  query: queryMock,
  queryOne: queryOneMock,
}));

vi.mock('../content-images', () => ({
  resolveContentImage: resolveContentImageMock,
}));

vi.mock('../metrics', () => ({
  recordRequest: recordRequestMock,
}));

vi.mock('../cache', () => ({
  deleteCachePattern: deleteCachePatternMock,
}));

vi.mock('../logging', () => ({
  logger: {
    setRequestId: loggerSetRequestIdMock,
    error: loggerErrorMock,
  },
}));

vi.mock('../auth/middleware', () => ({
  authenticateUser: authenticateUserMock,
}));

import { GET, PUT } from '../../pages/api/places/[id]/index';

describe('places detail api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryMock.mockReset();
    authenticateUserMock.mockReset();
    deleteCachePatternMock.mockReset();
    deleteCachePatternMock.mockResolvedValue(undefined);
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
      opening_hours: '{}',
      features: [],
      review_count: 0,
      rating: 0,
      avg_rating: 0,
      price_min: null,
      price_max: null,
      view_count: 0,
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

  it('allows owner to view non-active place', async () => {
    queryOneMock.mockResolvedValueOnce({
      id: 'place-1',
      slug: 'gobeklitepe',
      name: 'Göbeklitepe',
      category: 'tarihi-yerler',
      thumbnail_url: null,
      status: 'draft',
      owner_id: 'owner-1',
      opening_hours: '{}',
      features: [],
      review_count: 0,
      rating: 0,
      avg_rating: 0,
      price_min: null,
      price_max: null,
      view_count: 0,
    });

    resolveContentImageMock.mockReturnValue('/images/places/gobeklitepe.jpg');

    const response = await GET(
      createApiContext({
        url: 'http://localhost/api/places/place-1',
        params: { id: 'place-1' },
        locals: { user: { id: 'owner-1', role: 'vendor' } },
      })
    );

    expect(response.status).toBe(200);
  });

  it('returns 404 for non-owner on non-active place', async () => {
    queryOneMock.mockResolvedValueOnce({
      id: 'place-1',
      slug: 'gobeklitepe',
      name: 'Göbeklitepe',
      category: 'tarihi-yerler',
      thumbnail_url: null,
      status: 'draft',
      owner_id: 'owner-1',
      opening_hours: '{}',
      features: [],
      review_count: 0,
      rating: 0,
      avg_rating: 0,
      price_min: null,
      price_max: null,
      view_count: 0,
    });

    const response = await GET(
      createApiContext({
        url: 'http://localhost/api/places/place-1',
        params: { id: 'place-1' },
        locals: { user: { id: 'user-2', role: 'user' } },
      })
    );

    expect(response.status).toBe(404);
  });

  it('updates place for owner via PUT', async () => {
    authenticateUserMock.mockResolvedValueOnce({
      user: { id: 'owner-1', role: 'vendor', email: 'owner@example.com' },
    });
    queryOneMock.mockResolvedValueOnce({ id: 'place-1', owner_id: 'owner-1' });
    queryMock.mockResolvedValueOnce({
      rows: [{
        id: 'place-1',
        slug: 'gobeklitepe',
        name: 'Yeni Ad',
        category: 'tarihi-yerler',
        description: 'Yeni açıklama metni burada.',
        short_description: 'Yeni açıklama metni burada.',
        address: 'Yeni adres 123',
        phone: '05551234567',
        thumbnail_url: null,
        status: 'active',
        opening_hours: '{"mon":"09:00-18:00"}',
        features: ['wifi'],
        review_count: 0,
        rating: 0,
        avg_rating: 0,
        price_min: 100,
        price_max: 200,
        view_count: 0,
        owner_id: 'owner-1',
      }],
      rowCount: 1,
    } as any);
    resolveContentImageMock.mockReturnValue('/images/places/gobeklitepe.jpg');

    const response = await PUT(
      createApiContext({
        url: 'http://localhost/api/places/place-1',
        method: 'PUT',
        params: { id: 'place-1' },
        locals: { user: { id: 'owner-1', role: 'vendor' } },
        body: {
          name: 'Yeni Ad',
          address: 'Yeni adres 123',
          phone: '05551234567',
          description: 'Yeni açıklama metni burada.',
          price_min: 100,
          price_max: 200,
          opening_hours: { mon: '09:00-18:00' },
          features: ['wifi'],
        },
      })
    );
    const body = await parseJson(response);

    expect(response.status).toBe(200);
    expect(body?.data?.success).toBe(true);
    expect(queryMock).toHaveBeenCalled();
  });

  it('returns 403 for non-owner via PUT', async () => {
    authenticateUserMock.mockResolvedValueOnce({
      user: { id: 'user-2', role: 'vendor', email: 'user@example.com' },
    });
    queryOneMock.mockResolvedValueOnce({ id: 'place-1', owner_id: 'owner-1' });

    const response = await PUT(
      createApiContext({
        url: 'http://localhost/api/places/place-1',
        method: 'PUT',
        params: { id: 'place-1' },
        body: { name: 'Yeni Ad' },
      })
    );

    expect(response.status).toBe(403);
  });

  it('returns 401 for PUT when unauthenticated', async () => {
    authenticateUserMock.mockResolvedValueOnce(null);

    const response = await PUT(
      createApiContext({
        url: 'http://localhost/api/places/place-1',
        method: 'PUT',
        params: { id: 'place-1' },
      })
    );

    expect(response.status).toBe(401);
  });

  it('returns 400 for PUT when JSON body is missing', async () => {
    authenticateUserMock.mockResolvedValueOnce({
      user: { id: 'owner-1', role: 'vendor', email: 'owner@example.com' },
    });
    queryOneMock.mockResolvedValueOnce({ id: 'place-1', owner_id: 'owner-1' });

    const response = await PUT(
      createApiContext({
        url: 'http://localhost/api/places/place-1',
        method: 'PUT',
        params: { id: 'place-1' },
      })
    );

    expect(response.status).toBe(400);
  });

  it('returns 400 for PUT when no updatable fields are provided', async () => {
    authenticateUserMock.mockResolvedValueOnce({
      user: { id: 'owner-1', role: 'vendor', email: 'owner@example.com' },
    });
    queryOneMock.mockResolvedValueOnce({ id: 'place-1', owner_id: 'owner-1' });

    const response = await PUT(
      createApiContext({
        url: 'http://localhost/api/places/place-1',
        method: 'PUT',
        params: { id: 'place-1' },
        body: {},
      })
    );

    expect(response.status).toBe(400);
  });

  it('returns 400 for PUT when price range is invalid', async () => {
    authenticateUserMock.mockResolvedValueOnce({
      user: { id: 'owner-1', role: 'vendor', email: 'owner@example.com' },
    });
    queryOneMock.mockResolvedValueOnce({ id: 'place-1', owner_id: 'owner-1' });

    const response = await PUT(
      createApiContext({
        url: 'http://localhost/api/places/place-1',
        method: 'PUT',
        params: { id: 'place-1' },
        body: {
          price_min: 200,
          price_max: 100,
        },
      })
    );

    expect(response.status).toBe(400);
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
