/**
 * Unit Tests - following/following.ts vi.mock postgres+cache
 *
 * - followUser self-follow throw "Cannot follow yourself"
 * - followUser INSERT ON CONFLICT DO NOTHING (already following → silent return)
 * - followUser cache invalidate Promise.all (4 keys: followers/following/follower_count/following_count)
 * - unfollowUser DELETE + rowCount > 0 → cache invalidate + true; rowCount 0 → false
 * - isFollowing bool
 *
 * vi.hoisted - postgres + cache mocks.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const { queryMock, queryOneMock, deleteCacheMock } = vi.hoisted(() => ({
  queryMock: vi.fn(),
  queryOneMock: vi.fn(),
  deleteCacheMock: vi.fn(),
}));

vi.mock('../postgres', () => ({
  query: queryMock,
  queryOne: queryOneMock,
  queryMany: vi.fn(),
}));

vi.mock('../cache', () => ({
  getCache: vi.fn().mockResolvedValue(null),
  setCache: vi.fn().mockResolvedValue('OK'),
  deleteCache: deleteCacheMock,
}));

beforeEach(() => {
  queryMock.mockReset();
  queryOneMock.mockReset();
  deleteCacheMock.mockReset();
  deleteCacheMock.mockResolvedValue(1);
});

import { followUser, unfollowUser, isFollowing } from '../following/following';

describe('followUser', () => {
  it('self-follow - throw "Cannot follow yourself"', async () => {
    await expect(followUser('u-1', 'u-1')).rejects.toThrow(/Cannot follow yourself/);
  });

  it('successful insert - cache invalidate Promise.all (6 keys, cross-module coherency)', async () => {
    queryOneMock.mockResolvedValueOnce({ follower_id: 'u-1' });
    await followUser('u-1', 'u-2');
    // 6 cache invalidations: 4 follow-specific + 2 mutual-friends (cross-module: lib/followers)
    expect(deleteCacheMock).toHaveBeenCalledTimes(6);
    expect(deleteCacheMock).toHaveBeenCalledWith('followers:u-2');
    expect(deleteCacheMock).toHaveBeenCalledWith('following:u-1');
    expect(deleteCacheMock).toHaveBeenCalledWith('follower_count:u-2');
    expect(deleteCacheMock).toHaveBeenCalledWith('following_count:u-1');
    expect(deleteCacheMock).toHaveBeenCalledWith('mutual-friends:u-1');
    expect(deleteCacheMock).toHaveBeenCalledWith('mutual-friends:u-2');
  });

  it('ON CONFLICT (already following) - silent return + no cache invalidate', async () => {
    queryOneMock.mockResolvedValueOnce(null); // RETURNING null = already exists
    await followUser('u-1', 'u-2');
    expect(deleteCacheMock).not.toHaveBeenCalled();
  });

  it('exception - throw', async () => {
    queryOneMock.mockRejectedValueOnce(new Error('DB error'));
    await expect(followUser('u-1', 'u-2')).rejects.toThrow();
  });

  it('SQL has ON CONFLICT DO NOTHING + RETURNING', async () => {
    queryOneMock.mockResolvedValueOnce({ follower_id: 'u-1' });
    await followUser('u-1', 'u-2');
    const sqlCall = queryOneMock.mock.calls[0];
    expect(sqlCall[0]).toContain('ON CONFLICT (follower_id, following_id) DO NOTHING');
    expect(sqlCall[0]).toContain('RETURNING follower_id');
  });
});

describe('unfollowUser', () => {
  it('rowCount > 0 - true + cache invalidate (6 keys, cross-module coherency)', async () => {
    queryMock.mockResolvedValueOnce({ rowCount: 1 });
    expect(await unfollowUser('u-1', 'u-2')).toBe(true);
    // 6 keys: 4 follow-specific + 2 mutual-friends (cross-module: lib/followers)
    expect(deleteCacheMock).toHaveBeenCalledTimes(6);
  });

  it('rowCount 0 (not following) - false + no cache invalidate', async () => {
    queryMock.mockResolvedValueOnce({ rowCount: 0 });
    expect(await unfollowUser('u-1', 'u-2')).toBe(false);
    expect(deleteCacheMock).not.toHaveBeenCalled();
  });

  it('exception - throw', async () => {
    queryMock.mockRejectedValueOnce(new Error('DB error'));
    await expect(unfollowUser('u-1', 'u-2')).rejects.toThrow();
  });
});

describe('isFollowing', () => {
  it('found - true', async () => {
    queryOneMock.mockResolvedValueOnce({ id: 'follow-1' });
    expect(await isFollowing('u-1', 'u-2')).toBe(true);
  });

  it('not found - false', async () => {
    queryOneMock.mockResolvedValueOnce(null);
    expect(await isFollowing('u-1', 'u-2')).toBe(false);
  });

  it('SELECT id LIMIT 1 (efficient existence check)', async () => {
    queryOneMock.mockResolvedValueOnce(null);
    await isFollowing('u-1', 'u-2');
    const sqlCall = queryOneMock.mock.calls[0];
    expect(sqlCall[0]).toContain('SELECT id');
    expect(sqlCall[0]).toContain('LIMIT 1');
  });
});
