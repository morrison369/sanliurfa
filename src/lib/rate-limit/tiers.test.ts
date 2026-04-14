import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getRateLimitConfig,
  checkTierRateLimit,
  getUserTier,
  getRateLimitHeaders,
  getTierUpgradeMessage,
  TIER_LIMITS,
  type UserTier,
} from './tiers';

// Mock postgres
vi.mock('../postgres', () => ({
  query: vi.fn(),
}));

describe('Tier-based Rate Limiting', () => {
  describe('getRateLimitConfig', () => {
    it('should return default config for tier', () => {
      const config = getRateLimitConfig('free', '/api/unknown');
      
      expect(config.requests).toBe(TIER_LIMITS.free.default.requests);
      expect(config.windowMs).toBe(TIER_LIMITS.free.default.windowMs);
    });

    it('should return endpoint-specific config', () => {
      const config = getRateLimitConfig('free', '/api/search');
      
      expect(config.requests).toBe(30); // 30 req/min for search
      expect(config.windowMs).toBe(60 * 1000);
    });

    it('should return higher limits for premium tier', () => {
      const freeConfig = getRateLimitConfig('free', '/api/places');
      const premiumConfig = getRateLimitConfig('premium', '/api/places');
      
      expect(premiumConfig.requests).toBeGreaterThan(freeConfig.requests);
    });
  });

  describe('checkTierRateLimit', () => {
    it('should allow request when no Redis', async () => {
      const result = await checkTierRateLimit('user1', 'free', '/api/test');
      
      expect(result.allowed).toBe(true);
      expect(result.tier).toBe('free');
      expect(result.remaining).toBe(TIER_LIMITS.free.default.requests);
    });

    it('should track request count with Redis', async () => {
      const mockRedis = {
        incr: vi.fn().mockResolvedValue(1),
        pexpire: vi.fn().mockResolvedValue(undefined),
      };

      const result = await checkTierRateLimit('user1', 'free', '/api/test', mockRedis);

      expect(mockRedis.incr).toHaveBeenCalled();
      expect(mockRedis.pexpire).toHaveBeenCalled();
      expect(result.allowed).toBe(true);
    });

    it('should block when limit exceeded', async () => {
      const mockRedis = {
        incr: vi.fn().mockResolvedValue(101), // Over free limit
        pexpire: vi.fn().mockResolvedValue(undefined),
      };

      const result = await checkTierRateLimit('user1', 'free', '/api/test', mockRedis);

      expect(result.allowed).toBe(false);
      expect(result.retryAfter).toBeDefined();
    });
  });

  describe('getUserTier', () => {
    it('should return free for anonymous users', () => {
      const context = { locals: {} } as any;
      
      expect(getUserTier(context)).toBe('free');
    });

    it('should return admin for admin users', () => {
      const context = { locals: { user: { id: '1', isAdmin: true } } } as any;
      
      expect(getUserTier(context)).toBe('admin');
    });

    it('should return user subscription tier', () => {
      const context = { locals: { user: { id: '1', subscriptionTier: 'premium' } } } as any;
      
      expect(getUserTier(context)).toBe('premium');
    });
  });

  describe('getRateLimitHeaders', () => {
    it('should return rate limit headers', () => {
      const result = {
        allowed: true,
        limit: 100,
        remaining: 50,
        resetAt: new Date('2024-01-01T00:01:00Z'),
        tier: 'free' as UserTier,
      };

      const headers = getRateLimitHeaders(result);

      expect(headers['X-RateLimit-Limit']).toBe('100');
      expect(headers['X-RateLimit-Remaining']).toBe('50');
      expect(headers['X-RateLimit-Tier']).toBe('free');
    });
  });

  describe('getTierUpgradeMessage', () => {
    it('should return upgrade message for free tier', () => {
      const message = getTierUpgradeMessage('free', '/api/test');
      
      expect(message).toContain('Basic');
      expect(message).toContain('Premium');
    });

    it('should return empty for admin tier', () => {
      const message = getTierUpgradeMessage('admin', '/api/test');
      
      expect(message).toBe('');
    });
  });
});
