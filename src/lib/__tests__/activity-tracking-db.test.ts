/**
 * Unit Tests - activity/activity.ts (logActivity + getUserActivity)
 *
 * - logActivity insert + cache invalidate; failure swallowed (fire-and-forget)
 * - getUserActivity cache hit + miss path; default limit 20; metadata JSON.parse
 * - exception → empty array fallback
 *
 * vi.hoisted - postgres + cache mocks.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const { insertMock, queryManyMock, getCacheMock, setCacheMock } = vi.hoisted(() => ({
  insertMock: vi.fn(),
  queryManyMock: vi.fn(),
  getCacheMock: vi.fn(),
  setCacheMock: vi.fn(),
}));

vi.mock('../postgres', () => ({
  insert: insertMock,
  queryMany: queryManyMock,
}));

vi.mock('../cache', () => ({
  getCache: getCacheMock,
  setCache: setCacheMock,
}));

beforeEach(() => {
  insertMock.mockReset();
  queryManyMock.mockReset();
  getCacheMock.mockReset();
  setCacheMock.mockReset();
});

import { logActivity, getUserActivity } from '../activity/activity';

describe('logActivity', () => {
  it('insert + cache invalidate', async () => {
    insertMock.mockResolvedValueOnce({});
    setCacheMock.mockResolvedValueOnce(undefined);
    await logActivity('u-1', 'review_created', 'place', 'p-1', { placeName: 'X' });
    expect(insertMock).toHaveBeenCalled();
    const call = insertMock.mock.calls[0];
    expect(call[0]).toBe('user_activity');
    expect(call[1].user_id).toBe('u-1');
    expect(call[1].action_type).toBe('review_created');
    expect(call[1].metadata).toBe(JSON.stringify({ placeName: 'X' }));
    expect(setCacheMock).toHaveBeenCalledWith('activity:u-1', null, 0);
  });

  it('metadata null when undefined', async () => {
    insertMock.mockResolvedValueOnce({});
    await logActivity('u-1', 'level_up');
    expect(insertMock.mock.calls[0][1].metadata).toBeNull();
    expect(insertMock.mock.calls[0][1].reference_type).toBeNull();
    expect(insertMock.mock.calls[0][1].reference_id).toBeNull();
  });

  it('insert failure swallowed (fire-and-forget)', async () => {
    insertMock.mockRejectedValueOnce(new Error('DB error'));
    await expect(logActivity('u-1', 'foo')).resolves.toBeUndefined();
  });
});

describe('getUserActivity', () => {
  it('cache hit - DB skipped', async () => {
    getCacheMock.mockResolvedValueOnce([
      { id: 1, userId: 'u-1', actionType: 'review_created', createdAt: 't' },
    ]);
    const r = await getUserActivity('u-1');
    expect(r).toHaveLength(1);
    expect(queryManyMock).not.toHaveBeenCalled();
  });

  it('cache miss - DB query + cache set 120s', async () => {
    getCacheMock.mockResolvedValueOnce(null);
    queryManyMock.mockResolvedValueOnce([
      {
        id: 1,
        user_id: 'u-1',
        action_type: 'badge_earned',
        reference_type: 'badge',
        reference_id: 'b-1',
        metadata: JSON.stringify({ badgeName: 'Gezgin' }),
        created_at: 't',
      },
    ]);
    setCacheMock.mockResolvedValueOnce(undefined);
    const r = await getUserActivity('u-1');
    expect(r).toHaveLength(1);
    expect(r[0].userId).toBe('u-1');
    expect(r[0].actionType).toBe('badge_earned');
    expect(r[0].metadata).toEqual({ badgeName: 'Gezgin' });
    expect(setCacheMock).toHaveBeenCalledWith('activity:u-1', expect.any(Array), 120);
  });

  it('default limit 20 in SQL params', async () => {
    getCacheMock.mockResolvedValueOnce(null);
    queryManyMock.mockResolvedValueOnce([]);
    await getUserActivity('u-1');
    expect(queryManyMock.mock.calls[0][1]).toEqual(['u-1', 20]);
  });

  it('custom limit propagated', async () => {
    getCacheMock.mockResolvedValueOnce(null);
    queryManyMock.mockResolvedValueOnce([]);
    await getUserActivity('u-1', 100);
    expect(queryManyMock.mock.calls[0][1]).toEqual(['u-1', 100]);
  });

  it('metadata null - undefined in result', async () => {
    getCacheMock.mockResolvedValueOnce(null);
    queryManyMock.mockResolvedValueOnce([
      { id: 1, user_id: 'u-1', action_type: 'level_up', metadata: null, created_at: 't' },
    ]);
    const r = await getUserActivity('u-1');
    expect(r[0].metadata).toBeUndefined();
  });

  it('exception - empty array fallback', async () => {
    getCacheMock.mockResolvedValueOnce(null);
    queryManyMock.mockRejectedValueOnce(new Error('DB error'));
    expect(await getUserActivity('u-1')).toEqual([]);
  });
});
