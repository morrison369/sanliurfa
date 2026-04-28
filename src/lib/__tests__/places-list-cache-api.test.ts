import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApiContext, parseJson } from './helpers/api-test-helpers';

const {
  queryMock,
  insertMock,
  getCacheMock,
  setCacheMock,
  deleteCacheMock,
  resolveContentImageMock,
  loggerErrorMock,
  loggerWarnMock,
} = vi.hoisted(() => ({
  queryMock: vi.fn(),
  insertMock: vi.fn(),
  getCacheMock: vi.fn(),
  setCacheMock: vi.fn(),
  deleteCacheMock: vi.fn(),
  resolveContentImageMock: vi.fn(),
  loggerErrorMock: vi.fn(),
  loggerWarnMock: vi.fn(),
}));

vi.mock('../postgres', () => ({
  query: queryMock,
  insert: insertMock,
}));

vi.mock('../cache', () => ({
  getCache: getCacheMock,
  setCache: setCacheMock,
  deleteCache: deleteCacheMock,
}));

vi.mock('../content-images', () => ({
  resolveContentImage: resolveContentImageMock,
}));

vi.mock('../logging', () => ({
  logger: {
    error: loggerErrorMock,
    warn: loggerWarnMock,
  },
}));

import { GET, POST } from '../../pages/api/places/index';

describe('places list api cache behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveContentImageMock
      .mockReturnValueOnce('/images/places/gobeklitepe-thumb.jpg')
      .mockReturnValueOnce('/images/places/gobeklitepe.jpg');
  });

  it('returns cached payload with X-Cache HIT', async () => {
    const cachedPayload = {
      data: [{ id: 'place-1', slug: 'gobeklitepe' }],
      count: 1,
      pagination: { limit: 20, offset: 0, hasMore: false },
    };

    getCacheMock.mockResolvedValueOnce(cachedPayload);

    const response = await GET(createApiContext({ url: 'http://localhost/api/places?limit=20&offset=0' }));
    const body = await parseJson(response);

    expect(response.status).toBe(200);
    expect(response.headers.get('X-Cache')).toBe('HIT');
    expect(body?.data ?? body).toEqual(cachedPayload);
    expect(queryMock).not.toHaveBeenCalled();
    expect(setCacheMock).not.toHaveBeenCalled();
  });

  it('queries DB, returns MISS and stores cache when not cached', async () => {
    getCacheMock.mockResolvedValueOnce(null);
    queryMock
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'place-1',
            slug: 'gobeklitepe',
            thumbnail_url: null,
            status: 'active',
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [{ count: '1' }] });

    const response = await GET(createApiContext({ url: 'http://localhost/api/places?limit=20&offset=0' }));
    const body = await parseJson(response);

    expect(response.status).toBe(200);
    expect(response.headers.get('X-Cache')).toBe('MISS');
    const payload = body?.data ?? body;
    expect(payload?.count).toBe(1);
    expect(payload?.data?.[0]?.image_url).toBe('/images/places/gobeklitepe.jpg');
    expect(setCacheMock).toHaveBeenCalledTimes(1);
  });

  it('bypasses cache when featured=true', async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ count: '0' }] });

    const response = await GET(
      createApiContext({ url: 'http://localhost/api/places?featured=true&limit=20&offset=0' })
    );
    const body = await parseJson(response);

    expect(response.status).toBe(200);
    expect((body?.data ?? body)?.count).toBe(0);
    expect(getCacheMock).not.toHaveBeenCalled();
    expect(setCacheMock).not.toHaveBeenCalled();
  });

  it('queries DB with category and search filters', async () => {
    getCacheMock.mockResolvedValueOnce(null);
    queryMock
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ count: '0' }] });

    const response = await GET(
      createApiContext({
        url: 'http://localhost/api/places?category=tarihi-yerler&search=balikli&limit=10&offset=5',
      })
    );

    expect(response.status).toBe(200);
    expect(queryMock.mock.calls[0][0]).toContain('category = $2');
    expect(queryMock.mock.calls[0][0]).toContain('name ILIKE $3');
    expect(queryMock.mock.calls[0][1]).toEqual(['active', 'tarihi-yerler', '%balikli%', 10, 5]);
  });

  it('returns 403 for POST when non-admin', async () => {
    const response = await POST(
      createApiContext({
        url: 'http://localhost/api/places',
        method: 'POST',
        body: { slug: 'demo' },
        locals: { isAdmin: false },
      })
    );
    const body = await parseJson(response);

    expect(response.status).toBe(403);
    expect(body?.title || body?.error).toBe('Forbidden');
    expect(insertMock).not.toHaveBeenCalled();
  });

  it('rejects invalid POST payload before insert', async () => {
    const response = await POST(
      createApiContext({
        url: 'http://localhost/api/places',
        method: 'POST',
        body: { name: '', latitude: 120, tags: new Array(51).fill('x') },
        locals: { isAdmin: true },
      })
    );
    const body = await parseJson(response);

    expect(response.status).toBe(400);
    expect(body?.title).toBe('Geçersiz İstek');
    expect(insertMock).not.toHaveBeenCalled();
  });

  it('rejects invalid coordinates for admin POST', async () => {
    const response = await POST(
      createApiContext({
        url: 'http://localhost/api/places',
        method: 'POST',
        body: { name: 'Demo', latitude: 91, longitude: 181 },
        locals: { isAdmin: true },
      })
    );

    expect(response.status).toBe(400);
    expect(insertMock).not.toHaveBeenCalled();
  });

  it('creates place and invalidates cache for admin POST', async () => {
    insertMock.mockResolvedValueOnce({ id: 'place-1', slug: 'demo' });
    deleteCacheMock.mockResolvedValue(undefined);

    const response = await POST(
      createApiContext({
        url: 'http://localhost/api/places',
        method: 'POST',
        body: { slug: 'demo', name: 'Demo' },
        locals: { isAdmin: true },
      })
    );
    const body = await parseJson(response);

    expect(response.status).toBe(201);
    expect((body?.data?.data ?? body?.data)?.id).toBe('place-1');
    expect(insertMock).toHaveBeenCalledTimes(1);
    expect(deleteCacheMock).toHaveBeenCalledTimes(3);
  });

  it('continues when cache invalidation partially fails', async () => {
    insertMock.mockResolvedValueOnce({ id: 'place-2', slug: 'demo-2' });
    deleteCacheMock.mockRejectedValueOnce(new Error('cache-fail')).mockResolvedValue(undefined);

    const response = await POST(
      createApiContext({
        url: 'http://localhost/api/places',
        method: 'POST',
        body: { slug: 'demo-2', name: 'Demo2' },
        locals: { isAdmin: true },
      })
    );

    expect(response.status).toBe(201);
    expect(loggerWarnMock).toHaveBeenCalled();
  });
});
