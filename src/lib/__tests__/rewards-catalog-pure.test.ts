/**
 * Unit Tests - rewards/rewards-catalog.ts vi.mock postgres+cache+redeemPoints+notification
 *
 * - getRewardDetails (cache hit + DB + 600s TTL)
 * - redeemReward — reward not found → throw "Reward not found"
 * - insufficient points → throw "Insufficient points"
 * - out of stock (quantity_available reached) → throw "Reward out of stock"
 * - successful redemption → redemptionCode "RWD-{timestamp}-{hex}" + atomic quantity update
 *
 * vi.hoisted - postgres + cache + redeemPoints + notification mocks.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const { queryOneMock, insertMock, getCacheMock, setCacheMock, redeemPointsMock, createNotificationMock } = vi.hoisted(() => ({
  queryOneMock: vi.fn(),
  insertMock: vi.fn(),
  getCacheMock: vi.fn(),
  setCacheMock: vi.fn(),
  redeemPointsMock: vi.fn(),
  createNotificationMock: vi.fn(),
}));

vi.mock('../postgres', () => ({
  queryOne: queryOneMock,
  queryMany: vi.fn(),
  insert: insertMock,
}));

vi.mock('../cache', () => ({
  getCache: getCacheMock,
  setCache: setCacheMock,
  deleteCache: vi.fn().mockResolvedValue(1),
  deleteCachePattern: vi.fn().mockResolvedValue(1),
}));

vi.mock('../loyalty/loyalty-system', () => ({
  redeemPoints: redeemPointsMock,
}));

vi.mock('../notification/notifications-queue', () => ({
  createNotification: createNotificationMock,
}));

beforeEach(() => {
  queryOneMock.mockReset();
  insertMock.mockReset();
  getCacheMock.mockReset();
  setCacheMock.mockReset();
  redeemPointsMock.mockReset();
  createNotificationMock.mockReset();
  getCacheMock.mockResolvedValue(null);
  setCacheMock.mockResolvedValue('OK');
  redeemPointsMock.mockResolvedValue({ transaction: {}, newBalance: {} });
  createNotificationMock.mockResolvedValue('notif-1');
});

import { getRewardDetails, redeemReward } from '../rewards/rewards-catalog';

const mkReward = (overrides: any = {}) => ({
  id: 'reward-1',
  reward_name: 'Free Coffee',
  description: 'Get a free coffee',
  reward_type: 'voucher',
  points_cost: 100,
  quantity_available: 50,
  quantity_redeemed: 5,
  ...overrides,
});

describe('getRewardDetails', () => {
  it('cache hit - DB skip', async () => {
    getCacheMock.mockResolvedValueOnce(mkReward());
    const r = await getRewardDetails('reward-1');
    expect(r?.id).toBe('reward-1');
    expect(queryOneMock).not.toHaveBeenCalled();
  });

  it('cache miss + DB + 600s TTL', async () => {
    queryOneMock.mockResolvedValueOnce(mkReward());
    await getRewardDetails('reward-1');
    const setCall = setCacheMock.mock.calls[0];
    expect(setCall[2]).toBe(600);
  });

  it('not found - null', async () => {
    queryOneMock.mockResolvedValueOnce(null);
    expect(await getRewardDetails('non-existent')).toBeNull();
  });
});

describe('redeemReward', () => {
  it('reward not found - throw "Reward not found"', async () => {
    queryOneMock.mockResolvedValueOnce(null); // getRewardDetails miss
    await expect(redeemReward('u-1', 'non-existent', 100)).rejects.toThrow(/Reward not found/);
  });

  it('insufficient points - throw "Insufficient points"', async () => {
    queryOneMock.mockResolvedValueOnce(mkReward({ points_cost: 200 }));
    await expect(redeemReward('u-1', 'reward-1', 100)).rejects.toThrow(/Insufficient points/);
  });

  it('out of stock - throw "Reward out of stock"', async () => {
    queryOneMock.mockResolvedValueOnce(mkReward({
      quantity_available: 10,
      quantity_redeemed: 10, // sold out
    }));
    await expect(redeemReward('u-1', 'reward-1', 200)).rejects.toThrow(/out of stock/);
  });

  it('successful - redemption code "RWD-{ts}-{hex}" format + insert + notification', async () => {
    queryOneMock
      .mockResolvedValueOnce(mkReward()) // getRewardDetails
      .mockResolvedValueOnce({}); // quantity update
    insertMock.mockResolvedValueOnce({
      id: 'redemption-1',
      user_id: 'u-1',
      reward_id: 'reward-1',
      points_spent: 100,
      status: 'pending',
      redemption_code: 'mock-code',
    });

    const r = await redeemReward('u-1', 'reward-1', 200);
    expect(r.id).toBe('redemption-1');
    expect(redeemPointsMock).toHaveBeenCalledWith('u-1', 100, expect.any(String), 'reward-1');
    expect(createNotificationMock).toHaveBeenCalled();

    const insertCall = insertMock.mock.calls[0];
    expect(insertCall[1].redemption_code).toMatch(/^RWD-\d+-[A-F0-9]+$/);
  });

  it('quantity_available null - skip atomic update', async () => {
    queryOneMock.mockResolvedValueOnce(mkReward({ quantity_available: null }));
    insertMock.mockResolvedValueOnce({ id: 'r-1', status: 'pending' });
    await redeemReward('u-1', 'reward-1', 200);
    // quantity update is conditional on quantity_available; should not be called for null
    const sqlCall = queryOneMock.mock.calls.find((c) => c[0]?.includes('UPDATE rewards_catalog'));
    expect(sqlCall).toBeUndefined();
  });
});
