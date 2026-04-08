/**
 * Phase 45: API Rate Limiting & Quotas
 * Request throttling, token buckets, quota management, burst control
 */

import { logger } from './logging';

// ==================== TYPES & INTERFACES ====================

export type RateLimitAlgorithm = 'sliding-window' | 'token-bucket' | 'fixed-window';

export interface RateLimit {
  key: string;
  limit: number;
  windowMs: number;
  algorithm: RateLimitAlgorithm;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfter?: number;
}

export interface Quota {
  userId: string;
  feature: string;
  limit: number;
  used: number;
  period: string;
}

// ==================== RATE LIMITER ====================

export class RateLimiter {
  private configs = new Map<string, RateLimit>();
  private requests = new Map<string, number[]>();

  /**
   * Configure rate limit
   */
  configure(name: string, config: Omit<RateLimit, 'key'>): void {
    this.configs.set(name, { ...config, key: name });
    logger.debug('Rate limit configured', { name, limit: config.limit, windowMs: config.windowMs });
  }

  /**
   * Check if request allowed (sliding window)
   */
  check(name: string, key: string, tokens: number = 1): RateLimitResult {
    const config = this.configs.get(name);
    if (!config) {
      return { allowed: true, remaining: 0, resetAt: Date.now() };
    }

    const requestKey = `${name}:${key}`;
    const now = Date.now();
    const windowStart = now - config.windowMs;

    // Get requests in current window
    let requests = this.requests.get(requestKey) || [];
    requests = requests.filter(t => t > windowStart);

    const requestCount = requests.length + tokens;
    const allowed = requestCount <= config.limit;

    if (allowed) {
      requests.push(now);
      this.requests.set(requestKey, requests);
    }

    const resetAt = requests.length > 0 ? requests[0] + config.windowMs : now + config.windowMs;

    return {
      allowed,
      remaining: Math.max(0, config.limit - requestCount),
      resetAt,
      retryAfter: allowed ? undefined : Math.ceil((resetAt - now) / 1000)
    };
  }

  /**
   * Consume tokens
   */
  consume(name: string, key: string, tokens: number = 1): RateLimitResult {
    return this.check(name, key, tokens);
  }

  /**
   * Reset limit
   */
  reset(name: string, key: string): void {
    const requestKey = `${name}:${key}`;
    this.requests.delete(requestKey);
  }

  /**
   * Get stats
   */
  getStats(name: string): { totalRequests: number; blocked: number; blockRate: number } {
    const prefix = `${name}:`;
    let totalRequests = 0;

    for (const [key, requests] of this.requests) {
      if (key.startsWith(prefix)) {
        totalRequests += requests.length;
      }
    }

    return {
      totalRequests,
      blocked: 0,
      blockRate: 0
    };
  }
}

// ==================== BURST CONTROLLER ====================

export class BurstController {
  private buckets = new Map<string, { tokens: number; maxTokens: number; refillRate: number; lastRefill: number }>();

  /**
   * Allow burst
   */
  allowBurst(key: string, burstLimit: number, sustainedRate: number): boolean {
    let bucket = this.buckets.get(key);

    if (!bucket) {
      bucket = {
        tokens: burstLimit,
        maxTokens: burstLimit,
        refillRate: sustainedRate,
        lastRefill: Date.now()
      };

      this.buckets.set(key, bucket);
    }

    // Refill tokens
    const now = Date.now();
    const timePassed = (now - bucket.lastRefill) / 1000;
    bucket.tokens = Math.min(bucket.maxTokens, bucket.tokens + timePassed * bucket.refillRate);
    bucket.lastRefill = now;

    if (bucket.tokens >= 1) {
      bucket.tokens--;
      return true;
    }

    return false;
  }

  /**
   * Get burst stats
   */
  getBurstStats(key: string): { tokens: number; maxTokens: number; refillRate: number } | null {
    const bucket = this.buckets.get(key);
    return bucket
      ? {
          tokens: Math.round(bucket.tokens * 100) / 100,
          maxTokens: bucket.maxTokens,
          refillRate: bucket.refillRate
        }
      : null;
  }
}

// ==================== QUOTA MANAGER ====================

export class QuotaManager {
  private quotas = new Map<string, Quota>();

  /**
   * Set quota
   */
  setQuota(userId: string, feature: string, limit: number, period: string): void {
    const key = `${userId}:${feature}`;

    this.quotas.set(key, {
      userId,
      feature,
      limit,
      used: 0,
      period
    });

    logger.debug('Quota set', { userId, feature, limit, period });
  }

  /**
   * Consume quota
   */
  consume(userId: string, feature: string, amount: number = 1): { allowed: boolean; remaining: number } {
    const key = `${userId}:${feature}`;
    const quota = this.quotas.get(key);

    if (!quota) {
      return { allowed: true, remaining: Infinity };
    }

    const allowed = quota.used + amount <= quota.limit;

    if (allowed) {
      quota.used += amount;
    }

    return {
      allowed,
      remaining: Math.max(0, quota.limit - quota.used)
    };
  }

  /**
   * Reset quota
   */
  reset(userId: string, feature?: string): void {
    if (feature) {
      const key = `${userId}:${feature}`;
      const quota = this.quotas.get(key);
      if (quota) {
        quota.used = 0;
      }
    } else {
      for (const [key, quota] of this.quotas) {
        if (key.startsWith(userId + ':')) {
          quota.used = 0;
        }
      }
    }
  }

  /**
   * Get quotas
   */
  getQuotas(userId: string): Quota[] {
    const quotas: Quota[] = [];

    for (const [key, quota] of this.quotas) {
      if (key.startsWith(userId + ':')) {
        quotas.push(quota);
      }
    }

    return quotas;
  }

  /**
   * Get over-quota users
   */
  getOverQuota(feature: string): string[] {
    const users: string[] = [];

    for (const [key, quota] of this.quotas) {
      if (quota.feature === feature && quota.used > quota.limit) {
        users.push(quota.userId);
      }
    }

    return users;
  }
}

// ==================== EXPORTS ====================

export const rateLimiter = new RateLimiter();
export const burstController = new BurstController();
export const quotaManager = new QuotaManager();
