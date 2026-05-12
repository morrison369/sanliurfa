/**
 * Unit Tests - place/place-followers.ts vi.mock postgres+cache
 *
 * - followPlace (insert ON CONFLICT DO NOTHING + counter increment + cache invalidate)
 * - unfollowPlace (DELETE + counter decrement GREATEST(0, ...) + cache invalidate)
 * - isFollowingPlace (SELECT id boolean)
 * - getPlaceFollowerCount (cache hit + DB fallback)
 *
 * vi.hoisted - postgres + cache mocks.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const { queryMock, queryOneMock, queryManyMock, getCacheMock, setCacheMock, deleteCacheMock } = vi.hoisted(() => ({
  queryMock: vi.fn(),
  queryOneMock: vi.fn(),
  queryManyMock: vi.fn(),
  getCacheMock: vi.fn(),
  setCacheMock: vi.fn(),
  deleteCacheMock: vi.fn(),
}));

vi.mock('../postgres', () => ({
  query: queryMock,
  queryOne: queryOneMock,
  queryMany: queryManyMock,
}));

vi.mock('../cache', () => ({
  getCache: getCacheMock,
  setCache: setCacheMock,
  deleteCache: deleteCacheMock,
}));

vi.mock('../content-images', () => ({
  resolveContentImage: vi.fn().mockReturnValue('/images/placeholder.jpg'),
}));

beforeEach(() => {
  queryMock.mockReset();
  queryOneMock.mockReset();
  queryManyMock.mockReset();
  getCacheMock.mockReset();
  setCacheMock.mockReset();
  deleteCacheMock.mockReset();
  queryMock.mockResolvedValue({ rowCount: 1 });
  deleteCacheMock.mockResolvedValue(1);
  setCacheMock.mockResolvedValue('OK');
  getCacheMock.mockResolvedValue(null);
});

import {
  followPlace,
  unfollowPlace,
  isFollowingPlace,
  getPlaceFollowerCount,
} from '../place/place-followers';

describe('followPlace', () => {
  it('insert success - true + counter increment + cache invalidate', async () => {
    queryOneMock.mockResolvedValueOnce({ id: 'follow-1' });
    const r = await followPlace('user-1', 'place-1');
    expect(r).toBe(true);
    expect(queryMock).toHaveBeenCalled(); // counter UPDATE
    expect(deleteCacheMock).toHaveBeenCalled();
  });

  it('insert ON CONFLICT (already following) → false', async () => {
    queryOneMock.mockResolvedValueOnce(null); // RETURNING boş
    const r = await followPlace('user-1', 'place-1');
    expect(r).toBe(false);
  });

  it('exception - return false (catch handler)', async () => {
    queryOneMock.mockRejectedValueOnce(new Error('DB error'));
    const r = await followPlace('user-1', 'place-1');
    expect(r).toBe(false);
  });
});

describe('unfollowPlace', () => {
  it('delete success - true + counter decrement (GREATEST guard)', async () => {
    const r = await unfollowPlace('user-1', 'place-1');
    expect(r).toBe(true);
    expect(deleteCacheMock).toHaveBeenCalled();
  });

  it('exception - return false', async () => {
    queryMock.mockRejectedValueOnce(new Error('DB error'));
    const r = await unfollowPlace('user-1', 'place-1');
    expect(r).toBe(false);
  });
});

describe('isFollowingPlace', () => {
  it('kayıtlı - true', async () => {
    queryOneMock.mockResolvedValueOnce({ id: 'follow-1' });
    expect(await isFollowingPlace('user-1', 'place-1')).toBe(true);
  });

  it('kayıtsız - false', async () => {
    queryOneMock.mockResolvedValueOnce(null);
    expect(await isFollowingPlace('user-1', 'place-1')).toBe(false);
  });

  it('exception - false (catch handler)', async () => {
    queryOneMock.mockRejectedValueOnce(new Error('DB error'));
    expect(await isFollowingPlace('user-1', 'place-1')).toBe(false);
  });
});

describe('getPlaceFollowerCount', () => {
  it('returns follower_count from places table', async () => {
    queryOneMock.mockResolvedValueOnce({ follower_count: 42 });
    expect(await getPlaceFollowerCount('place-1')).toBe(42);
  });

  it('null result → 0 fallback', async () => {
    queryOneMock.mockResolvedValueOnce(null);
    expect(await getPlaceFollowerCount('place-1')).toBe(0);
  });

  it('null follower_count → 0 fallback', async () => {
    queryOneMock.mockResolvedValueOnce({ follower_count: null });
    expect(await getPlaceFollowerCount('place-1')).toBe(0);
  });

  it('exception - 0 (catch handler)', async () => {
    queryOneMock.mockRejectedValueOnce(new Error('DB error'));
    expect(await getPlaceFollowerCount('place-1')).toBe(0);
  });
});
