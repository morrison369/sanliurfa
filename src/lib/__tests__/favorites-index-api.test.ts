/**
 * API Contract Tests - GET + POST + DELETE /api/favorites
 *
 * GET:
 * - Auth required → 401 problem+json
 * - Cache hit → returns cached data (DB skipped)
 * - Cache miss → DB query + setCache 5-min TTL
 *
 * POST:
 * - Auth required → 401
 * - Missing placeId → 400
 * - HARD RULE #47: Atomic INSERT ON CONFLICT (rowCount 0 → already-exists 400)
 * - Success: +5 points + logActivity + invalidate cache
 *
 * DELETE:
 * - Auth required → 401
 * - Missing placeId → 400
 * - DELETE WHERE place_id AND user_id (owner scope) + cache invalidate
 *
 * vi.hoisted - postgres + cache + activity mocks.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createApiContext, parseJson } from './helpers/api-test-helpers';

const { queryMock, queryOneMock, getCacheMock, setCacheMock, deleteCacheMock, logActivityMock } = vi.hoisted(() => ({
  queryMock: vi.fn(),
  queryOneMock: vi.fn(),
  getCacheMock: vi.fn(),
  setCacheMock: vi.fn(),
  deleteCacheMock: vi.fn(),
  logActivityMock: vi.fn(),
}));

vi.mock('../postgres', () => ({
  query: queryMock,
  queryOne: queryOneMock,
}));

vi.mock('../cache', () => ({
  getCache: getCacheMock,
  setCache: setCacheMock,
  deleteCache: deleteCacheMock,
}));

vi.mock('../activity', () => ({
  logActivity: logActivityMock,
}));

beforeEach(() => {
  queryMock.mockReset();
  queryMock.mockResolvedValue({ rows: [], rowCount: 0 });
  queryOneMock.mockReset();
  queryOneMock.mockResolvedValue(null);
  getCacheMock.mockReset();
  getCacheMock.mockResolvedValue(null);
  setCacheMock.mockReset();
  setCacheMock.mockResolvedValue(undefined);
  deleteCacheMock.mockReset();
  deleteCacheMock.mockResolvedValue(undefined);
  logActivityMock.mockReset();
  logActivityMock.mockResolvedValue(undefined);
});

import { GET, POST, DELETE } from '../../pages/api/favorites';

const authedUser = { id: 'user-1', email: 'u@t.com', role: 'user' };

describe('GET /api/favorites', () => {
  it('no auth → 401 problem+json', async () => {
    const ctx = createApiContext({ locals: {} });
    const resp = await GET(ctx);
    expect(resp.status).toBe(401);
    const data = await parseJson(resp);
    expect(data.type).toBe('/problems/favorites-unauthorized');
  });

  it('cache hit → returns cached (DB skipped)', async () => {
    getCacheMock.mockResolvedValueOnce({ data: [{ id: 'f-1' }] });
    const ctx = createApiContext({ locals: { user: authedUser } });
    const resp = await GET(ctx);
    expect(resp.status).toBe(200);
    expect(queryMock).not.toHaveBeenCalled();
  });

  it('cache miss → DB + setCache 5-min TTL (300s)', async () => {
    queryMock.mockResolvedValueOnce({ rows: [{ id: 'f-1', place_name: 'X' }] });
    const ctx = createApiContext({ locals: { user: authedUser } });
    await GET(ctx);
    expect(queryMock).toHaveBeenCalled();
    const setCall = setCacheMock.mock.calls[0];
    expect(setCall[0]).toBe('favorites:user:user-1');
    expect(setCall[2]).toBe(300);
  });
});

describe('POST /api/favorites', () => {
  it('no auth → 401', async () => {
    const ctx = createApiContext({
      method: 'POST',
      body: { placeId: 'p-1' },
      locals: {},
    });
    const resp = await POST(ctx);
    expect(resp.status).toBe(401);
  });

  it('missing placeId → 400', async () => {
    const ctx = createApiContext({
      method: 'POST',
      body: {},
      locals: { user: authedUser },
    });
    const resp = await POST(ctx);
    expect(resp.status).toBe(400);
  });

  it('HARD RULE #47 - already exists (rowCount 0) → 400 already-exists', async () => {
    queryMock.mockResolvedValueOnce({ rows: [], rowCount: 0 }); // INSERT ON CONFLICT no rows
    const ctx = createApiContext({
      method: 'POST',
      body: { placeId: 'p-1' },
      locals: { user: authedUser },
    });
    const resp = await POST(ctx);
    expect(resp.status).toBe(400);
    const data = await parseJson(resp);
    expect(data.type).toBe('/problems/favorites-already-exists');
    expect(logActivityMock).not.toHaveBeenCalled();
  });

  it('success → 201 + 5 points UPDATE + logActivity + cache invalidate', async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [{ id: 'f-1', place_id: 'p-1', user_id: 'user-1' }], rowCount: 1 }) // INSERT
      .mockResolvedValueOnce({ rowCount: 1 }); // UPDATE points
    queryOneMock.mockResolvedValueOnce({ name: 'Test Place' });
    const ctx = createApiContext({
      method: 'POST',
      body: { placeId: 'p-1' },
      locals: { user: authedUser },
    });
    const resp = await POST(ctx);
    expect(resp.status).toBe(201);
    expect(queryMock.mock.calls[1][0]).toContain('UPDATE users SET points');
    expect(logActivityMock).toHaveBeenCalledWith('user-1', 'favorite_add', expect.objectContaining({
      entityType: 'place',
      entityId: 'p-1',
    }));
    expect(deleteCacheMock).toHaveBeenCalledWith('favorites:user:user-1');
  });

  it('atomic INSERT contains ON CONFLICT DO NOTHING', async () => {
    queryMock.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    const ctx = createApiContext({
      method: 'POST',
      body: { placeId: 'p-1' },
      locals: { user: authedUser },
    });
    await POST(ctx);
    const sql = queryMock.mock.calls[0][0];
    expect(sql).toContain('ON CONFLICT (place_id, user_id) DO NOTHING');
    expect(sql).toContain('RETURNING');
  });
});

describe('DELETE /api/favorites', () => {
  it('no auth → 401', async () => {
    const ctx = createApiContext({
      method: 'DELETE',
      body: { placeId: 'p-1' },
      locals: {},
    });
    const resp = await DELETE(ctx);
    expect(resp.status).toBe(401);
  });

  it('missing placeId → 400', async () => {
    const ctx = createApiContext({
      method: 'DELETE',
      body: {},
      locals: { user: authedUser },
    });
    const resp = await DELETE(ctx);
    expect(resp.status).toBe(400);
  });

  it('success → DELETE WHERE place_id AND user_id + cache invalidate', async () => {
    const ctx = createApiContext({
      method: 'DELETE',
      body: { placeId: 'p-1' },
      locals: { user: authedUser },
    });
    const resp = await DELETE(ctx);
    expect(resp.status).toBe(200);
    const sql = queryMock.mock.calls[0][0];
    expect(sql).toContain('DELETE FROM user_favorites WHERE place_id = $1 AND user_id = $2');
    expect(deleteCacheMock).toHaveBeenCalledWith('user_favorites:user:user-1');
  });
});
