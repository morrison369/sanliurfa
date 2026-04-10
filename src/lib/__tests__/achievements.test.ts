import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getUserAchievements, getUnviewedAchievements, markAchievementViewed, getAchievementStats } from '../achievements';

vi.mock('../postgres', () => ({
  queryOne: vi.fn(),
  queryRows: vi.fn(),
  insert: vi.fn(),
  query: vi.fn()
}));

vi.mock('../cache', () => ({
  getCache: vi.fn(),
  setCache: vi.fn(),
  deleteCache: vi.fn()
}));

vi.mock('../logging', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn()
  }
}));

vi.mock('../loyalty-points', () => ({
  awardPoints: vi.fn()
}));

describe('Achievements Library', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getUserAchievements', () => {
    it('returns cached achievements', async () => {
      const mockCache = await import('../cache');
      const achievements = [
        { id: '1', achievement_key: 'first_review', name: 'First Review', unlocked_at: new Date() }
      ];

      mockCache.getCache.mockResolvedValueOnce(achievements);

      const result = await getUserAchievements('user-123');

      expect(result).toEqual(achievements);
      expect(mockCache.getCache).toHaveBeenCalledWith('sanliurfa:achievements:user:user-123');
    });

    it('queries database if not cached', async () => {
      const mockCache = await import('../cache');
      const mockDb = await import('../postgres');

      mockCache.getCache.mockResolvedValueOnce(null);
      mockDb.queryRows.mockResolvedValueOnce([
        { id: '1', achievement_key: 'first_review', name: 'First Review' }
      ]);

      const result = await getUserAchievements('user-456');

      expect(result).toHaveLength(1);
      expect(mockDb.queryRows).toHaveBeenCalled();
      expect(mockCache.setCache).toHaveBeenCalledWith(
        'sanliurfa:achievements:user:user-456',
        expect.any(Array),
        1800
      );
    });
  });

  describe('getUnviewedAchievements', () => {
    it('returns unviewed achievements only', async () => {
      const mockDb = await import('../postgres');
      mockDb.queryRows.mockResolvedValueOnce([
        { id: '2', achievement_key: 'five_reviews', viewed: false }
      ]);

      const result = await getUnviewedAchievements('user-789');

      expect(result).toHaveLength(1);
      expect(mockDb.queryRows).toHaveBeenCalledWith(
        expect.stringContaining('viewed = false'),
        ['user-789']
      );
    });
  });

  describe('markAchievementViewed', () => {
    it('marks achievement as viewed and clears cache', async () => {
      const mockDb = await import('../postgres');
      const mockCache = await import('../cache');

      mockDb.query.mockResolvedValueOnce({});

      await markAchievementViewed('achievement-1', 'user-123');

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE user_achievements SET viewed = true'),
        ['achievement-1', 'user-123']
      );
      expect(mockCache.deleteCache).toHaveBeenCalledWith('sanliurfa:achievements:user:user-123');
    });
  });

  describe('getAchievementStats', () => {
    it('returns achievement statistics', async () => {
      const mockDb = await import('../postgres');
      const mockCache = await import('../cache');

      mockCache.getCache.mockResolvedValueOnce(null);
      mockDb.queryOne
        .mockResolvedValueOnce({ count: '5' }) // total unlocked
        .mockResolvedValueOnce({ count: '20' }); // total available
      mockDb.queryRows.mockResolvedValueOnce([
        { category: 'review', unlocked_count: '3', total_count: '10' }
      ]);

      const result = await getAchievementStats('user-stats');

      expect(result.total_unlocked).toBe(5);
      expect(result.total_available).toBe(20);
      expect(result.unlock_percentage).toBe(25);
      expect(result.by_category).toHaveProperty('review');
    });
  });
});
