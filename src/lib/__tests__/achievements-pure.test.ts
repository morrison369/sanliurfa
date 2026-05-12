/**
 * Unit Tests - achievements/achievements.ts vi.mock postgres+cache+awardPoints+notification
 *
 * - getAllAchievements (cache + 1-hour TTL 3600s)
 * - getAchievementByKey (DB query)
 * - unlockAchievementIfEarned (achievement lookup + INSERT ON CONFLICT + awardPoints + notification)
 * - achievement not found → unlocked: false (no awardPoints/notification)
 * - already unlocked (RETURNING null) → unlocked: false + achievement returned
 *
 * vi.hoisted - postgres + cache + awardPoints + createNotification mocks.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const { queryOneMock, queryManyMock, getCacheMock, setCacheMock, awardPointsMock, createNotificationMock } = vi.hoisted(() => ({
  queryOneMock: vi.fn(),
  queryManyMock: vi.fn(),
  getCacheMock: vi.fn(),
  setCacheMock: vi.fn(),
  awardPointsMock: vi.fn(),
  createNotificationMock: vi.fn(),
}));

vi.mock('../postgres', () => ({
  query: vi.fn(),
  queryOne: queryOneMock,
  queryMany: queryManyMock,
}));

vi.mock('../cache', () => ({
  getCache: getCacheMock,
  setCache: setCacheMock,
  deleteCache: vi.fn().mockResolvedValue(1),
}));

vi.mock('../loyalty/loyalty-system', () => ({
  awardPoints: awardPointsMock,
}));

vi.mock('../notification/notifications-queue', () => ({
  createNotification: createNotificationMock,
}));

beforeEach(() => {
  queryOneMock.mockReset();
  queryManyMock.mockReset();
  getCacheMock.mockReset();
  setCacheMock.mockReset();
  awardPointsMock.mockReset();
  createNotificationMock.mockReset();
  getCacheMock.mockResolvedValue(null);
  setCacheMock.mockResolvedValue('OK');
  awardPointsMock.mockResolvedValue({ transaction: {}, newBalance: {} });
  createNotificationMock.mockResolvedValue('notif-1');
});

import {
  getAllAchievements,
  getAchievementByKey,
  unlockAchievementIfEarned,
} from '../achievements/achievements';

describe('getAllAchievements', () => {
  it('cache hit - DB skip', async () => {
    getCacheMock.mockResolvedValueOnce([{ id: 'a-1', name: 'Cached' }]);
    const r = await getAllAchievements();
    expect(r).toHaveLength(1);
    expect(queryManyMock).not.toHaveBeenCalled();
  });

  it('cache miss + DB + 1-hour TTL (3600s)', async () => {
    queryManyMock.mockResolvedValueOnce([{ id: 'a-1', achievement_key: 'first-login' }]);
    await getAllAchievements();
    const setCall = setCacheMock.mock.calls[0];
    expect(setCall[2]).toBe(3600);
  });

  it('exception - throw', async () => {
    queryManyMock.mockRejectedValueOnce(new Error('DB error'));
    await expect(getAllAchievements()).rejects.toThrow();
  });
});

describe('getAchievementByKey', () => {
  it('found - return achievement', async () => {
    queryOneMock.mockResolvedValueOnce({ id: 'a-1', achievement_key: 'first-login' });
    const r = await getAchievementByKey('first-login');
    expect(r?.achievement_key).toBe('first-login');
  });

  it('not found - null', async () => {
    queryOneMock.mockResolvedValueOnce(null);
    expect(await getAchievementByKey('non-existent')).toBeNull();
  });
});

describe('unlockAchievementIfEarned', () => {
  it('achievement found + insert success → unlocked + awardPoints + notification', async () => {
    queryOneMock
      .mockResolvedValueOnce({
        id: 'a-1',
        achievement_key: 'first-review',
        name: 'İlk Yorum',
        description: 'İlk yorumunu yazdın!',
        points_reward: 50,
      })
      .mockResolvedValueOnce({ id: 'ua-1' }); // INSERT RETURNING

    const r = await unlockAchievementIfEarned('u-1', 'first-review');
    expect(r.unlocked).toBe(true);
    expect(r.achievement?.achievement_key).toBe('first-review');
    expect(awardPointsMock).toHaveBeenCalledWith('u-1', 50, expect.stringContaining('İlk Yorum'));
    expect(createNotificationMock).toHaveBeenCalled();
  });

  it('achievement not found - unlocked: false', async () => {
    queryOneMock.mockResolvedValueOnce(null);
    const r = await unlockAchievementIfEarned('u-1', 'non-existent');
    expect(r.unlocked).toBe(false);
    expect(r.achievement).toBeUndefined();
    expect(awardPointsMock).not.toHaveBeenCalled();
  });

  it('already unlocked (ON CONFLICT) - unlocked: false + achievement returned', async () => {
    queryOneMock
      .mockResolvedValueOnce({ id: 'a-1', name: 'Test', points_reward: 50 })
      .mockResolvedValueOnce(null); // INSERT RETURNING null (duplicate)

    const r = await unlockAchievementIfEarned('u-1', 'first-login');
    expect(r.unlocked).toBe(false);
    expect(r.achievement).toBeDefined();
    expect(awardPointsMock).not.toHaveBeenCalled();
  });

  it('points_reward 0 - awardPoints skipped', async () => {
    queryOneMock
      .mockResolvedValueOnce({ id: 'a-1', name: 'Free', points_reward: 0 })
      .mockResolvedValueOnce({ id: 'ua-1' });

    await unlockAchievementIfEarned('u-1', 'free-achievement');
    expect(awardPointsMock).not.toHaveBeenCalled();
  });

  it('exception - return unlocked: false', async () => {
    queryOneMock.mockRejectedValueOnce(new Error('DB error'));
    const r = await unlockAchievementIfEarned('u-1', 'any');
    expect(r.unlocked).toBe(false);
  });
});
