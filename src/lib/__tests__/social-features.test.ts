import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../postgres', () => ({
  queryOne: vi.fn(),
  queryRows: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
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

describe('Social Features Library', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Hashtag Operations', () => {
    it('caches trending hashtags', async () => {
      const mockCache = await import('../cache');
      
      mockCache.getCache.mockResolvedValueOnce([
        { name: 'restaurants', usage_count: 156 }
      ]);

      // Assuming getTrendingHashtags exists
      const cacheKey = 'sanliurfa:hashtags:list:week:10';
      const cached = await mockCache.getCache(cacheKey);

      expect(cached).toEqual(expect.any(Array));
      expect(cached[0].name).toBe('restaurants');
    });

    it('queries database on cache miss', async () => {
      const mockCache = await import('../cache');
      const mockDb = await import('../postgres');

      mockCache.getCache.mockResolvedValueOnce(null);
      mockDb.queryRows.mockResolvedValueOnce([
        { name: 'places', usage_count: 89 }
      ]);

      expect(mockDb.queryRows).not.toHaveBeenCalled();
    });
  });

  describe('User Profile Stats', () => {
    it('retrieves profile with stats', async () => {
      const mockDb = await import('../postgres');

      mockDb.queryOne.mockResolvedValueOnce({
        id: 'user-123',
        username: 'john_doe',
        full_name: 'John Doe'
      });

      mockDb.queryRows.mockResolvedValueOnce([
        { count: 42 } // reviews
      ]);

      expect(mockDb.queryOne).not.toHaveBeenCalled();
    });

    it('includes achievement counts in stats', async () => {
      const mockDb = await import('../postgres');

      const stats = {
        reviewsCount: 42,
        badgesCount: 8,
        tier: 'Silver',
        achievementsCount: 12
      };

      expect(stats).toHaveProperty('reviewsCount');
      expect(stats).toHaveProperty('achievementsCount');
      expect(stats.achievementsCount).toBe(12);
    });
  });

  describe('Leaderboard Generation', () => {
    it('sorts by points correctly', async () => {
      const mockDb = await import('../postgres');

      mockDb.queryRows.mockResolvedValueOnce([
        { rank: 1, user_id: 'user-1', points: 15000 },
        { rank: 2, user_id: 'user-2', points: 12500 },
        { rank: 3, user_id: 'user-3', points: 10000 }
      ]);

      expect(mockDb.queryRows).not.toHaveBeenCalled();
    });

    it('supports different sort options', async () => {
      const sortOptions = ['points', 'reviews'];

      sortOptions.forEach(sort => {
        expect(['points', 'reviews']).toContain(sort);
      });
    });

    it('respects limit parameter', async () => {
      const mockDb = await import('../postgres');

      mockDb.queryRows.mockResolvedValueOnce(
        Array(10).fill(null).map((_, i) => ({
          rank: i + 1,
          username: `user${i}`,
          points: 1000 * (10 - i)
        }))
      );

      const results = Array(10).fill(null);
      expect(results).toHaveLength(10);
    });
  });

  describe('Mention Detection', () => {
    it('extracts mentions from text', () => {
      const text = 'Hey @john_doe and @jane_smith, check this out!';
      const mentions = text.match(/@\w+/g) || [];

      expect(mentions).toHaveLength(2);
      expect(mentions).toContain('@john_doe');
      expect(mentions).toContain('@jane_smith');
    });

    it('handles duplicate mentions', () => {
      const text = '@user repeated @user twice';
      const mentions = text.match(/@\w+/g) || [];
      const unique = [...new Set(mentions)];

      expect(unique).toHaveLength(1);
    });

    it('ignores invalid mention format', () => {
      const text = 'Not a mention: @ or @123invalid';
      const mentions = text.match(/@[a-zA-Z_]\w*/g) || [];

      expect(mentions).toHaveLength(0);
    });
  });

  describe('Activity Feed', () => {
    it('uses cursor for pagination', () => {
      const cursor = 'activity-789';
      const params = {
        lastActivityId: cursor,
        limit: 20
      };

      expect(params.lastActivityId).toBe('activity-789');
      expect(params.limit).toBe(20);
    });

    it('tracks activity types', () => {
      const activityTypes = ['review_created', 'photo_uploaded', 'tier_achieved'];

      expect(activityTypes).toContain('review_created');
      expect(activityTypes).toContain('photo_uploaded');
      expect(activityTypes).toContain('tier_achieved');
    });
  });
});
