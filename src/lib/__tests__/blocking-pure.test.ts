/**
 * Unit Tests - block/blocking.ts blockUser (vi.mock postgres+cache)
 *
 * - blockUser self-block → throw "Kendinizi engelleyemezsiniz"
 * - INSERT ON CONFLICT DO NOTHING + RETURNING; null → fetch existing
 * - existing block fetch on conflict → return existing UserBlock shape
 * - exception throw
 *
 * vi.hoisted - postgres + cache mocks.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const { queryMock, queryOneMock, queryManyMock } = vi.hoisted(() => ({
  queryMock: vi.fn(),
  queryOneMock: vi.fn(),
  queryManyMock: vi.fn(),
}));

vi.mock('../postgres', () => ({
  query: queryMock,
  queryOne: queryOneMock,
  queryMany: queryManyMock,
}));

vi.mock('../cache', () => ({
  deleteCache: vi.fn().mockResolvedValue(1),
}));

beforeEach(() => {
  queryMock.mockReset();
  queryOneMock.mockReset();
  queryManyMock.mockReset();
});

import { blockUser, isUserBlocked, getBlockedUsers, getBlockedByUsers } from '../block/blocking';

describe('blockUser', () => {
  it('valid block - INSERT success → UserBlock shape', async () => {
    queryOneMock.mockResolvedValueOnce({
      id: 'block-1',
      blocker_id: 'u-1',
      blocked_id: 'u-2',
      reason: 'spam',
      created_at: '2026-05-05',
    });
    const r = await blockUser('u-1', 'u-2', 'spam');
    expect(r.id).toBe('block-1');
    expect(r.blocker_id).toBe('u-1');
    expect(r.reason).toBe('spam');
  });

  it('self-block - throw "Kendinizi engelleyemezsiniz"', async () => {
    await expect(blockUser('u-1', 'u-1')).rejects.toThrow(/Kendinizi engelleyemezsiniz/);
  });

  it('ON CONFLICT (already blocked) - existing fetch + return', async () => {
    queryOneMock
      .mockResolvedValueOnce(null) // INSERT RETURNING null (conflict)
      .mockResolvedValueOnce({
        id: 'existing-block',
        blocker_id: 'u-1',
        blocked_id: 'u-2',
        reason: 'old reason',
        created_at: '2026-04-01',
      });
    const r = await blockUser('u-1', 'u-2', 'new reason');
    expect(r.id).toBe('existing-block');
    expect(r.reason).toBe('old reason');
  });

  it('reason optional - null kabul edilir', async () => {
    queryOneMock.mockResolvedValueOnce({
      id: 'b-3',
      blocker_id: 'u-1',
      blocked_id: 'u-2',
      reason: null,
      created_at: 't',
    });
    const r = await blockUser('u-1', 'u-2');
    expect(r.reason).toBeNull();
  });

  it('exception - throw', async () => {
    queryOneMock.mockRejectedValueOnce(new Error('DB error'));
    await expect(blockUser('u-1', 'u-2')).rejects.toThrow();
  });
});

describe('isUserBlocked', () => {
  it('blocked → true', async () => {
    queryOneMock.mockResolvedValueOnce({ id: 'b-1' });
    expect(await isUserBlocked('u-1', 'u-2')).toBe(true);
  });

  it('not blocked → false', async () => {
    queryOneMock.mockResolvedValueOnce(null);
    expect(await isUserBlocked('u-1', 'u-2')).toBe(false);
  });

  it('exception - throw', async () => {
    queryOneMock.mockRejectedValueOnce(new Error('DB error'));
    await expect(isUserBlocked('u-1', 'u-2')).rejects.toThrow();
  });
});

describe('getBlockedUsers', () => {
  it('blocked users array shape map (block_id + blocked_user nested)', async () => {
    queryManyMock.mockResolvedValueOnce([
      {
        id: 'b-1', blocked_id: 'u-2', reason: 'spam', created_at: 't',
        full_name: 'Ali', username: 'ali', avatar_url: null, level: 1, points: 100,
      },
    ]);
    const r = await getBlockedUsers('u-1');
    expect(r).toHaveLength(1);
    expect(r[0].block_id).toBe('b-1');
    expect(r[0].blocked_user.full_name).toBe('Ali');
    expect(r[0].reason).toBe('spam');
  });

  it('limit + offset parameters', async () => {
    queryManyMock.mockResolvedValueOnce([]);
    await getBlockedUsers('u-1', 25, 50);
    const sqlCall = queryManyMock.mock.calls[0];
    expect(sqlCall[1]).toEqual(['u-1', 25, 50]);
  });
});

describe('getBlockedByUsers', () => {
  it('returns array of blocker_id strings', async () => {
    queryManyMock.mockResolvedValueOnce([
      { blocker_id: 'u-blocker-1' },
      { blocker_id: 'u-blocker-2' },
    ]);
    const r = await getBlockedByUsers('u-1');
    expect(r).toEqual(['u-blocker-1', 'u-blocker-2']);
  });
});
