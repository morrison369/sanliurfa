/**
 * Unit Tests - badges/badges.ts vi.mock postgres
 *
 * - getAllBadges (is_active = true + ORDER BY badge_category, display_order ASC)
 * - getUserBadges (JOIN + ORDER BY is_featured DESC, earned_at DESC)
 * - awardBadgeToUser (badge lookup + INSERT ON CONFLICT DO NOTHING + return false if already awarded)
 * - badge not found - false + warning log
 * - getUserBadgeCount (parseInt fallback 0)
 *
 * vi.hoisted - postgres mocks.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const { queryOneMock, queryManyMock } = vi.hoisted(() => ({
  queryOneMock: vi.fn(),
  queryManyMock: vi.fn(),
}));

vi.mock('../postgres', () => ({
  queryOne: queryOneMock,
  queryMany: queryManyMock,
  update: vi.fn(),
}));

beforeEach(() => {
  queryOneMock.mockReset();
  queryManyMock.mockReset();
});

import { getAllBadges, getUserBadges, awardBadgeToUser, getUserBadgeCount } from '../badges/badges';

describe('getAllBadges', () => {
  it('returns badges array + is_active=true filter', async () => {
    queryManyMock.mockResolvedValueOnce([
      { id: 'b-1', badge_key: 'early-adopter' },
      { id: 'b-2', badge_key: 'first-review' },
    ]);
    const r = await getAllBadges();
    expect(r).toHaveLength(2);
    const sqlCall = queryManyMock.mock.calls[0];
    expect(sqlCall[0]).toContain('is_active = true');
    expect(sqlCall[0]).toContain('badge_category');
  });

  it('exception - empty array fallback', async () => {
    queryManyMock.mockRejectedValueOnce(new Error('DB error'));
    expect(await getAllBadges()).toEqual([]);
  });
});

describe('getUserBadges', () => {
  it('JOIN with badges + ORDER BY is_featured DESC', async () => {
    queryManyMock.mockResolvedValueOnce([{ id: 'ub-1', badge_id: 'b-1', earned_at: 't' }]);
    const r = await getUserBadges('u-1');
    expect(r).toHaveLength(1);
    const sqlCall = queryManyMock.mock.calls[0];
    expect(sqlCall[0]).toContain('JOIN badges');
    expect(sqlCall[0]).toContain('is_featured DESC');
    expect(sqlCall[1]).toEqual(['u-1']);
  });

  it('exception - empty array', async () => {
    queryManyMock.mockRejectedValueOnce(new Error('DB error'));
    expect(await getUserBadges('u-1')).toEqual([]);
  });
});

describe('awardBadgeToUser', () => {
  it('badge found + INSERT success - true', async () => {
    queryOneMock
      .mockResolvedValueOnce({ id: 'b-1' }) // badge lookup
      .mockResolvedValueOnce({ id: 'ub-1' }); // INSERT RETURNING
    expect(await awardBadgeToUser('u-1', 'first-review', 'reason')).toBe(true);
  });

  it('badge not found - false', async () => {
    queryOneMock.mockResolvedValueOnce(null);
    expect(await awardBadgeToUser('u-1', 'non-existent')).toBe(false);
  });

  it('ON CONFLICT (already awarded) - false (RETURNING null)', async () => {
    queryOneMock
      .mockResolvedValueOnce({ id: 'b-1' })
      .mockResolvedValueOnce(null); // duplicate, RETURNING null
    expect(await awardBadgeToUser('u-1', 'first-review')).toBe(false);
  });

  it('reason null default', async () => {
    queryOneMock
      .mockResolvedValueOnce({ id: 'b-1' })
      .mockResolvedValueOnce({ id: 'ub-1' });
    await awardBadgeToUser('u-1', 'first-review');
    const insertCall = queryOneMock.mock.calls[1];
    expect(insertCall[1][2]).toBeNull();
  });

  it('exception - false', async () => {
    queryOneMock.mockRejectedValueOnce(new Error('DB error'));
    expect(await awardBadgeToUser('u-1', 'badge-key')).toBe(false);
  });
});

describe('getUserBadgeCount', () => {
  it('count with parseInt - 5', async () => {
    queryOneMock.mockResolvedValueOnce({ count: '5' });
    expect(await getUserBadgeCount('u-1')).toBe(5);
  });

  it('null count - 0 fallback', async () => {
    queryOneMock.mockResolvedValueOnce({ count: null });
    expect(await getUserBadgeCount('u-1')).toBe(0);
  });

  it('null result - 0 fallback', async () => {
    queryOneMock.mockResolvedValueOnce(null);
    expect(await getUserBadgeCount('u-1')).toBe(0);
  });
});
