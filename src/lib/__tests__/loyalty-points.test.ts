import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getUserPoints, awardPoints, spendPoints } from '../loyalty-points';

// Mock database and cache
vi.mock('../postgres', () => ({
  queryOne: vi.fn(),
  queryMany: vi.fn(),
  insert: vi.fn(),
  update: vi.fn()
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

describe('Loyalty Points Library', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getUserPoints', () => {
    it('returns cached points if available', async () => {
      const mockCache = await import('../cache');
      mockCache.getCache.mockResolvedValueOnce({
        currentBalance: 100,
        lifetimeEarned: 500,
        lifetimeSpent: 400
      });

      const result = await getUserPoints('user-123');

      expect(result.currentBalance).toBe(100);
      expect(mockCache.getCache).toHaveBeenCalledWith('sanliurfa:loyalty:balance:user-123');
    });

    it('fetches from database if not cached', async () => {
      const mockDb = await import('../postgres');
      const mockCache = await import('../cache');

      mockCache.getCache.mockResolvedValueOnce(null);
      mockDb.queryOne.mockResolvedValueOnce({
        current_balance: 200,
        lifetime_earned: 600,
        lifetime_spent: 400,
        pending_points: 0,
        last_earned_at: new Date()
      });

      const result = await getUserPoints('user-456');

      expect(result.currentBalance).toBe(200);
      expect(mockDb.queryOne).toHaveBeenCalled();
      expect(mockCache.setCache).toHaveBeenCalled();
    });
  });

  describe('awardPoints', () => {
    it('creates transaction and updates balance', async () => {
      const mockDb = await import('../postgres');
      const mockCache = await import('../cache');

      mockDb.queryOne.mockResolvedValueOnce({ current_balance: 100 });
      mockDb.insert.mockResolvedValueOnce({});
      mockDb.update.mockResolvedValueOnce({});

      const result = await awardPoints('user-789', 50, 'test award', 'test_type', 'ref-123');

      expect(result).toBe(true);
      expect(mockDb.insert).toHaveBeenCalledWith('loyalty_transactions', expect.objectContaining({
        user_id: 'user-789',
        points_amount: 50,
        transaction_reason: 'test award'
      }));
      expect(mockCache.deleteCache).toHaveBeenCalledWith('sanliurfa:loyalty:balance:user-789');
    });

    it('returns false on error', async () => {
      const mockDb = await import('../postgres');
      mockDb.queryOne.mockRejectedValueOnce(new Error('DB Error'));

      const result = await awardPoints('user-error', 50, 'failed award');

      expect(result).toBe(false);
    });
  });

  describe('spendPoints', () => {
    it('checks balance before spending', async () => {
      const mockDb = await import('../postgres');
      mockDb.queryOne.mockResolvedValueOnce({ current_balance: 30 });

      const result = await spendPoints('user-low', 50, 'insufficient points');

      expect(result).toBe(false);
      expect(mockDb.insert).not.toHaveBeenCalled();
    });

    it('spends points and updates balance', async () => {
      const mockDb = await import('../postgres');
      const mockCache = await import('../cache');

      mockDb.queryOne.mockResolvedValueOnce({ current_balance: 200 });
      mockDb.insert.mockResolvedValueOnce({});
      mockDb.update.mockResolvedValueOnce({});

      const result = await spendPoints('user-rich', 100, 'reward redemption', 'reward-456');

      expect(result).toBe(true);
      expect(mockDb.insert).toHaveBeenCalledWith('loyalty_transactions', expect.objectContaining({
        transaction_type: 'spend',
        points_amount: 100
      }));
    });
  });
});
