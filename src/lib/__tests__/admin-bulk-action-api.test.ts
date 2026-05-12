/**
 * API Contract Tests - POST /api/admin/bulk-action
 *
 * - Admin role check (NOT isAdmin — HARD RULE #52: locals.user.role !== 'admin')
 * - Action allowlist (delete/approve/reject/activate/deactivate/ban/unban + ...)
 * - UUID format validation per item
 * - Max 500 items DoS cap
 * - Resource type allowlist (places/reviews/users/blog_posts/events/photos)
 * - Cache invalidation pattern per resource type
 *
 * vi.hoisted - postgres + cache mocks.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createApiContext, parseJson } from './helpers/api-test-helpers';

const { queryMock, deleteCachePatternMock } = vi.hoisted(() => ({
  queryMock: vi.fn(),
  deleteCachePatternMock: vi.fn(),
}));

vi.mock('../postgres', () => ({
  query: queryMock,
}));

vi.mock('../cache', () => ({
  deleteCachePattern: deleteCachePatternMock,
}));

beforeEach(() => {
  queryMock.mockReset();
  queryMock.mockResolvedValue({ rowCount: 1 });
  deleteCachePatternMock.mockReset();
  deleteCachePatternMock.mockResolvedValue(undefined);
});

import { POST } from '../../pages/api/admin/bulk-action';

const ADMIN = { id: 'admin-1', email: 'a@t.com', role: 'admin' };
const MOD = { id: 'mod-1', email: 'm@t.com', role: 'moderator' };
const VALID_ID = '11111111-1111-1111-1111-111111111111';
const VALID_ID_2 = '22222222-2222-2222-2222-222222222222';

describe('POST /api/admin/bulk-action', () => {
  it('non-admin role → 403 (HARD RULE #52: not isAdmin)', async () => {
    const ctx = createApiContext({
      method: 'POST',
      body: { action: 'delete', items: [VALID_ID], type: 'places' },
      locals: { user: MOD }, // moderator must not pass
    });
    const resp = await POST(ctx);
    expect(resp.status).toBe(403);
  });

  it('no auth → 403', async () => {
    const ctx = createApiContext({
      method: 'POST',
      body: { action: 'delete', items: [VALID_ID] },
      locals: {},
    });
    const resp = await POST(ctx);
    expect(resp.status).toBe(403);
  });

  it('invalid action → 400 validation', async () => {
    const ctx = createApiContext({
      method: 'POST',
      body: { action: 'destroy_universe', items: [VALID_ID] },
      locals: { user: ADMIN },
    });
    const resp = await POST(ctx);
    expect(resp.status).toBe(400);
  });

  it('empty items array → 400', async () => {
    const ctx = createApiContext({
      method: 'POST',
      body: { action: 'delete', items: [] },
      locals: { user: ADMIN },
    });
    const resp = await POST(ctx);
    expect(resp.status).toBe(400);
  });

  it('items > 500 → 400 DoS cap', async () => {
    const tooMany = Array.from({ length: 501 }, () => VALID_ID);
    const ctx = createApiContext({
      method: 'POST',
      body: { action: 'delete', items: tooMany },
      locals: { user: ADMIN },
    });
    const resp = await POST(ctx);
    expect(resp.status).toBe(400);
    const data = await parseJson(resp);
    expect(data.error.message).toMatch(/500/);
  });

  it('non-UUID items filtered, all-invalid → 400', async () => {
    const ctx = createApiContext({
      method: 'POST',
      body: { action: 'delete', items: ['not-uuid', '<script>', '../path'] },
      locals: { user: ADMIN },
    });
    const resp = await POST(ctx);
    expect(resp.status).toBe(400);
  });

  it('valid delete on places → UPDATE status=inactive', async () => {
    queryMock.mockResolvedValueOnce({ rowCount: 2 });
    const ctx = createApiContext({
      method: 'POST',
      body: { action: 'delete', items: [VALID_ID, VALID_ID_2], type: 'places' },
      locals: { user: ADMIN },
    });
    const resp = await POST(ctx);
    expect(resp.status).toBe(200);
    const sql = queryMock.mock.calls[0][0];
    expect(sql).toContain("UPDATE places SET status = 'inactive'");
    const data = await parseJson(resp);
    expect(data.data.affected).toBe(2);
  });

  it('delete on users → soft delete (status=deleted + deleted_at NOW)', async () => {
    queryMock.mockResolvedValueOnce({ rowCount: 1 });
    const ctx = createApiContext({
      method: 'POST',
      body: { action: 'delete', items: [VALID_ID], type: 'users' },
      locals: { user: ADMIN },
    });
    await POST(ctx);
    const sql = queryMock.mock.calls[0][0];
    expect(sql).toContain("status = 'deleted'");
    expect(sql).toContain('deleted_at = NOW()');
  });

  it('approve on reviews → is_active=true (non-status table)', async () => {
    queryMock.mockResolvedValueOnce({ rowCount: 3 });
    const ctx = createApiContext({
      method: 'POST',
      body: { action: 'approve', items: [VALID_ID], type: 'reviews' },
      locals: { user: ADMIN },
    });
    await POST(ctx);
    const sql = queryMock.mock.calls[0][0];
    expect(sql).toContain('UPDATE reviews SET is_active = true');
  });

  it('ban → users.is_banned + banned_at', async () => {
    queryMock.mockResolvedValueOnce({ rowCount: 1 });
    const ctx = createApiContext({
      method: 'POST',
      body: { action: 'ban', items: [VALID_ID] },
      locals: { user: ADMIN },
    });
    await POST(ctx);
    const sql = queryMock.mock.calls[0][0];
    expect(sql).toContain('is_banned = true');
    expect(sql).toContain('banned_at = NOW()');
  });

  it('feature → is_featured=true on places (default)', async () => {
    queryMock.mockResolvedValueOnce({ rowCount: 1 });
    const ctx = createApiContext({
      method: 'POST',
      body: { action: 'feature', items: [VALID_ID] },
      locals: { user: ADMIN },
    });
    await POST(ctx);
    const sql = queryMock.mock.calls[0][0];
    expect(sql).toContain('UPDATE places SET is_featured = true');
  });

  it('cache invalidation called per resource type', async () => {
    queryMock.mockResolvedValueOnce({ rowCount: 1 });
    const ctx = createApiContext({
      method: 'POST',
      body: { action: 'delete', items: [VALID_ID], type: 'reviews' },
      locals: { user: ADMIN },
    });
    await POST(ctx);
    expect(deleteCachePatternMock).toHaveBeenCalledWith('reviews:*');
  });

  it('invalid resource type falls back to places', async () => {
    queryMock.mockResolvedValueOnce({ rowCount: 1 });
    const ctx = createApiContext({
      method: 'POST',
      body: { action: 'delete', items: [VALID_ID], type: 'evil_table' },
      locals: { user: ADMIN },
    });
    await POST(ctx);
    const sql = queryMock.mock.calls[0][0];
    expect(sql).toContain('UPDATE places');
  });

  it('DB error → 500 with safeErrorDetail (no raw message leak)', async () => {
    queryMock.mockRejectedValueOnce(new Error('duplicate key violates "places_slug_unique"'));
    const ctx = createApiContext({
      method: 'POST',
      body: { action: 'delete', items: [VALID_ID] },
      locals: { user: ADMIN },
    });
    const resp = await POST(ctx);
    expect(resp.status).toBe(500);
    const data = await parseJson(resp);
    expect(data.error.message).not.toContain('duplicate key'); // sanitized
  });
});
