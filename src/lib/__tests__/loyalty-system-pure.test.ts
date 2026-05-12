/**
 * Unit Tests - loyalty/loyalty-system.ts vi.mock postgres+cache
 *
 * - initializeLoyaltyBalance (insert with default tier 'bronze' + zero balances)
 * - getLoyaltyBalance (cache hit + DB + 300s TTL + null guard)
 * - LoyaltyBalance shape (total/available/redeemed/lifetime points)
 *
 * vi.hoisted - postgres + cache + notification mocks.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const { queryOneMock, insertMock, getCacheMock, setCacheMock } = vi.hoisted(() => ({
  queryOneMock: vi.fn(),
  insertMock: vi.fn(),
  getCacheMock: vi.fn(),
  setCacheMock: vi.fn(),
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
}));

vi.mock('../notification/notifications-queue', () => ({
  createNotification: vi.fn().mockResolvedValue('notif-1'),
}));

beforeEach(() => {
  queryOneMock.mockReset();
  insertMock.mockReset();
  getCacheMock.mockReset();
  setCacheMock.mockReset();
  getCacheMock.mockResolvedValue(null);
  setCacheMock.mockResolvedValue('OK');
});

import { initializeLoyaltyBalance, getLoyaltyBalance } from '../loyalty/loyalty-system';

describe('initializeLoyaltyBalance', () => {
  it('insert + default current_tier "bronze" + zero balances', async () => {
    insertMock.mockResolvedValueOnce({
      id: 'balance-1',
      user_id: 'u-1',
      total_points: 0,
      available_points: 0,
      redeemed_points: 0,
      lifetime_points: 0,
      current_tier: 'bronze',
    });
    const r = await initializeLoyaltyBalance('u-1');
    expect(r.current_tier).toBe('bronze');
    expect(r.available_points).toBe(0);
    const insertCall = insertMock.mock.calls[0];
    expect(insertCall[0]).toBe('user_loyalty_balance');
    expect(insertCall[1].current_tier).toBe('bronze');
  });

  it('exception - throw', async () => {
    insertMock.mockRejectedValueOnce(new Error('DB error'));
    await expect(initializeLoyaltyBalance('u-1')).rejects.toThrow();
  });
});

describe('getLoyaltyBalance', () => {
  it('cache hit - DB skip', async () => {
    getCacheMock.mockResolvedValueOnce({
      id: 'cached-balance',
      user_id: 'u-1',
      total_points: 500,
      current_tier: 'silver',
    });
    const r = await getLoyaltyBalance('u-1');
    expect(r?.total_points).toBe(500);
    expect(r?.current_tier).toBe('silver');
    expect(queryOneMock).not.toHaveBeenCalled();
  });

  it('cache miss + DB + 300s TTL', async () => {
    queryOneMock.mockResolvedValueOnce({
      id: 'b-1',
      user_id: 'u-1',
      total_points: 100,
      current_tier: 'bronze',
    });
    await getLoyaltyBalance('u-1');
    const setCall = setCacheMock.mock.calls[0];
    expect(setCall[2]).toBe(300);
  });

  it('not found - null + cache skip', async () => {
    queryOneMock.mockResolvedValueOnce(null);
    expect(await getLoyaltyBalance('non-existent')).toBeNull();
    expect(setCacheMock).not.toHaveBeenCalled();
  });

  it('exception - throw', async () => {
    queryOneMock.mockRejectedValueOnce(new Error('DB error'));
    await expect(getLoyaltyBalance('u-1')).rejects.toThrow();
  });
});
