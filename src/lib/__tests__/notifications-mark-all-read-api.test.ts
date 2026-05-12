/**
 * API Contract Tests - POST /api/notifications/mark-all-read
 *
 * - Auth required → 401 problem+json
 * - UPDATE notifications SET read=true, read_at=NOW WHERE user_id AND read=false
 * - DB error → 500 problem+json
 *
 * vi.hoisted - postgres mock.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createApiContext, parseJson } from './helpers/api-test-helpers';

const { queryMock } = vi.hoisted(() => ({
  queryMock: vi.fn(),
}));

vi.mock('../postgres', () => ({
  query: queryMock,
}));

beforeEach(() => {
  queryMock.mockReset();
  queryMock.mockResolvedValue({ rowCount: 5 });
});

import { POST } from '../../pages/api/notifications/mark-all-read';

const authedUser = { id: 'user-1', email: 'u@t.com', role: 'user' };

describe('POST /api/notifications/mark-all-read', () => {
  it('no auth → 401 /problems/auth-required', async () => {
    const ctx = createApiContext({ method: 'POST', locals: {} });
    const resp = await POST(ctx);
    expect(resp.status).toBe(401);
    const data = await parseJson(resp);
    expect(data.type).toBe('/problems/auth-required');
    expect(queryMock).not.toHaveBeenCalled();
  });

  it('valid - UPDATE called + 200 success', async () => {
    const ctx = createApiContext({ method: 'POST', locals: { user: authedUser } });
    const resp = await POST(ctx);
    expect(resp.status).toBe(200);
    expect(queryMock).toHaveBeenCalled();
  });

  it('SQL contains user_id filter + read=false guard', async () => {
    const ctx = createApiContext({ method: 'POST', locals: { user: authedUser } });
    await POST(ctx);
    const sql = queryMock.mock.calls[0][0];
    expect(sql).toContain('UPDATE notifications SET read = true');
    expect(sql).toContain('WHERE user_id = $2');
    expect(sql).toContain('read = false'); // only update unread (idempotent)
  });

  it('read_at timestamp passed as ISO string', async () => {
    const before = Date.now();
    const ctx = createApiContext({ method: 'POST', locals: { user: authedUser } });
    await POST(ctx);
    const params = queryMock.mock.calls[0][1];
    expect(typeof params[0]).toBe('string'); // ISO date string
    expect(new Date(params[0]).getTime()).toBeGreaterThanOrEqual(before);
    expect(params[1]).toBe('user-1'); // userId
  });

  it('DB error → 500 /problems/notifications-mark-all-read-failed', async () => {
    queryMock.mockRejectedValueOnce(new Error('DB error'));
    const ctx = createApiContext({ method: 'POST', locals: { user: authedUser } });
    const resp = await POST(ctx);
    expect(resp.status).toBe(500);
    const data = await parseJson(resp);
    expect(data.type).toBe('/problems/notifications-mark-all-read-failed');
  });

  it('idempotent - second call (no unread) succeeds with 200', async () => {
    queryMock.mockResolvedValueOnce({ rowCount: 0 }); // no unread to update
    const ctx = createApiContext({ method: 'POST', locals: { user: authedUser } });
    const resp = await POST(ctx);
    expect(resp.status).toBe(200);
  });
});
