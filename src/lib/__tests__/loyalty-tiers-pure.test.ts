/**
 * Unit Tests - loyalty/loyalty-tiers.ts vi.mock postgres+cache
 *
 * - getUserTierInfo (cache hit + DB JOIN)
 * - calculateUserTier (find tier by points threshold + DESC + LIMIT 1)
 * - updateUserTier (atomic upsert + tier_history insert + cache invalidate)
 * - tier_history insert ONLY when previousTierId !== newTierId
 *
 * vi.hoisted - postgres + cache mocks.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const { queryOneMock, insertMock, getCacheMock, setCacheMock, deleteCacheMock } = vi.hoisted(() => ({
  queryOneMock: vi.fn(),
  insertMock: vi.fn(),
  getCacheMock: vi.fn(),
  setCacheMock: vi.fn(),
  deleteCacheMock: vi.fn(),
}));

vi.mock('../postgres', () => ({
  queryOne: queryOneMock,
  queryMany: vi.fn(),
  insert: insertMock,
}));

vi.mock('../cache', () => ({
  deleteCache: deleteCacheMock,
  getCache: getCacheMock,
  setCache: setCacheMock,
}));

beforeEach(() => {
  queryOneMock.mockReset();
  insertMock.mockReset();
  getCacheMock.mockReset();
  setCacheMock.mockReset();
  deleteCacheMock.mockReset();
  getCacheMock.mockResolvedValue(null);
  setCacheMock.mockResolvedValue('OK');
  deleteCacheMock.mockResolvedValue(1);
});

import { getUserTierInfo, calculateUserTier, updateUserTier } from '../loyalty/loyalty-tiers';

describe('getUserTierInfo', () => {
  it('cache hit - DB skip', async () => {
    getCacheMock.mockResolvedValueOnce({ tier_key: 'silver', tier_level: 2 });
    const r = await getUserTierInfo('u-1');
    expect(r?.tier_key).toBe('silver');
    expect(queryOneMock).not.toHaveBeenCalled();
  });

  it('cache miss + DB JOIN + 30-min TTL (1800s)', async () => {
    queryOneMock.mockResolvedValueOnce({ tier_key: 'gold', tier_level: 3 });
    const r = await getUserTierInfo('u-1');
    expect(r?.tier_key).toBe('gold');
    const setCall = setCacheMock.mock.calls[0];
    expect(setCall[2]).toBe(1800);
  });

  it('not found - null + cache skip', async () => {
    queryOneMock.mockResolvedValueOnce(null);
    expect(await getUserTierInfo('u-1')).toBeNull();
    expect(setCacheMock).not.toHaveBeenCalled();
  });
});

describe('calculateUserTier', () => {
  it('points found - tier resolved (DESC + LIMIT 1)', async () => {
    queryOneMock
      .mockResolvedValueOnce({ current_balance: 500 }) // points lookup
      .mockResolvedValueOnce({ tier_key: 'silver', tier_level: 2, min_points_required: 250 });
    const r = await calculateUserTier('u-1');
    expect(r?.tier_key).toBe('silver');
    const tierSqlCall = queryOneMock.mock.calls[1];
    expect(tierSqlCall[0]).toContain('ORDER BY tier_level DESC');
    expect(tierSqlCall[0]).toContain('LIMIT 1');
  });

  it('no points record - null', async () => {
    queryOneMock.mockResolvedValueOnce(null);
    expect(await calculateUserTier('u-1')).toBeNull();
  });

  it('points exist but no matching tier - null', async () => {
    queryOneMock
      .mockResolvedValueOnce({ current_balance: 0 })
      .mockResolvedValueOnce(null);
    expect(await calculateUserTier('u-1')).toBeNull();
  });
});

describe('updateUserTier', () => {
  it('tier change - upsert + tier_history insert + cache invalidate', async () => {
    queryOneMock
      .mockResolvedValueOnce({ current_tier_id: 'tier-bronze' }) // current tier lookup
      .mockResolvedValueOnce({ id: 'membership-1' }); // ON CONFLICT UPDATE
    insertMock.mockResolvedValueOnce({ id: 'history-1' }); // tier_history

    expect(await updateUserTier('u-1', 'tier-silver', 'Promotion')).toBe(true);
    expect(insertMock).toHaveBeenCalledWith('tier_history', expect.objectContaining({
      previous_tier_id: 'tier-bronze',
      new_tier_id: 'tier-silver',
      promotion_reason: 'Promotion',
    }));
    expect(deleteCacheMock).toHaveBeenCalledWith('tier:user:u-1');
  });

  it('same tier - no tier_history insert', async () => {
    queryOneMock
      .mockResolvedValueOnce({ current_tier_id: 'tier-silver' })
      .mockResolvedValueOnce({ id: 'm-1' });
    insertMock.mockResolvedValue({ id: 'h-1' });

    await updateUserTier('u-1', 'tier-silver');
    // tier_history insert skipped because previous === new
    expect(insertMock).not.toHaveBeenCalled();
  });

  it('no previous tier - no tier_history insert', async () => {
    queryOneMock
      .mockResolvedValueOnce(null) // no current tier
      .mockResolvedValueOnce({ id: 'm-1' });
    await updateUserTier('u-1', 'tier-bronze');
    expect(insertMock).not.toHaveBeenCalled();
  });

  it('exception - return false', async () => {
    queryOneMock.mockRejectedValueOnce(new Error('DB error'));
    expect(await updateUserTier('u-1', 'tier-x')).toBe(false);
  });
});
