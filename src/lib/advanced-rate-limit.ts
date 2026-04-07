/**
 * Advanced rate limiting with multiple strategies
 * Supports global limits, per-user limits, per-endpoint limits, and burst handling
 */

import { getRedisClient } from './redis-client';
import { logger } from './logging';

export interface RateLimitConfig {
  windowSizeMs: number;
  maxRequests: number;
  keyPrefix?: string;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  retryAfter?: number;
}

/**
 * Sliding window rate limiter (most accurate)
 */
export class SlidingWindowLimiter {
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = {
      keyPrefix: 'sanliurfa:rate_limit:sw:',
      ...config
    };
  }

  /**
   * Check if request is allowed
   */
  async isAllowed(identifier: string): Promise<RateLimitResult> {
    const redis = getRedisClient();
    if (!redis) {
      return { allowed: true, remaining: -1, resetAt: new Date() };
    }

    const key = `${this.config.keyPrefix}${identifier}`;
    const now = Date.now();
    const windowStart = now - this.config.windowSizeMs;

    try {
      // Remove old entries outside the window
      await redis.zremrangebyscore(key, 0, windowStart);

      // Count requests in current window
      const count = await redis.zcard(key);

      if (count >= this.config.maxRequests) {
        // At limit - calculate retry after
        const oldestRequest = await redis.zrange(key, 0, 0);
        const retryAfter = oldestRequest[0]
          ? Math.ceil((parseInt(oldestRequest[0]) + this.config.windowSizeMs - now) / 1000)
          : Math.ceil(this.config.windowSizeMs / 1000);

        return {
          allowed: false,
          remaining: 0,
          resetAt: new Date(now + this.config.windowSizeMs),
          retryAfter
        };
      }

      // Add current request
      await redis.zadd(key, now, `${now}-${Math.random()}`);
      await redis.expire(key, Math.ceil(this.config.windowSizeMs / 1000));

      return {
        allowed: true,
        remaining: this.config.maxRequests - count - 1,
        resetAt: new Date(now + this.config.windowSizeMs)
      };
    } catch (error) {
      logger.error('Rate limit check failed', error instanceof Error ? error : new Error(String(error)), {
        identifier,
        method: 'sliding_window'
      });

      // Fail open on error
      return { allowed: true, remaining: -1, resetAt: new Date() };
    }
  }
}

/**
 * Token bucket rate limiter (allows bursts)
 */
export class TokenBucketLimiter {
  private config: RateLimitConfig & { refillRatePerSecond: number };

  constructor(config: RateLimitConfig & { refillRatePerSecond?: number }) {
    this.config = {
      keyPrefix: 'sanliurfa:rate_limit:tb:',
      refillRatePerSecond: config.maxRequests / (config.windowSizeMs / 1000),
      ...config
    };
  }

  /**
   * Check if request is allowed (and consume tokens)
   */
  async isAllowed(identifier: string): Promise<RateLimitResult> {
    const redis = getRedisClient();
    if (!redis) {
      return { allowed: true, remaining: -1, resetAt: new Date() };
    }

    const key = `${this.config.keyPrefix}${identifier}`;
    const lastRefillKey = `${key}:last_refill`;
    const now = Date.now() / 1000; // Convert to seconds

    try {
      // Get current tokens and last refill time
      const [tokensStr, lastRefillStr] = await Promise.all([
        redis.get(key),
        redis.get(lastRefillKey)
      ]);

      let tokens = tokensStr ? parseFloat(tokensStr) : this.config.maxRequests;
      const lastRefill = lastRefillStr ? parseFloat(lastRefillStr) : now;

      // Refill tokens based on elapsed time
      const elapsedSeconds = now - lastRefill;
      const tokensToAdd = elapsedSeconds * this.config.refillRatePerSecond;
      tokens = Math.min(this.config.maxRequests, tokens + tokensToAdd);

      if (tokens >= 1) {
        // Consume 1 token
        tokens -= 1;

        // Update Redis
        const ttl = Math.ceil(this.config.windowSizeMs / 1000);
        await Promise.all([
          redis.setex(key, ttl, tokens.toString()),
          redis.setex(lastRefillKey, ttl, now.toString())
        ]);

        return {
          allowed: true,
          remaining: Math.floor(tokens),
          resetAt: new Date(now * 1000 + this.config.windowSizeMs)
        };
      } else {
        // No tokens available
        const retryAfter = Math.ceil((1 - tokens) / this.config.refillRatePerSecond);

        return {
          allowed: false,
          remaining: 0,
          resetAt: new Date((now + retryAfter) * 1000),
          retryAfter
        };
      }
    } catch (error) {
      logger.error('Token bucket check failed', error instanceof Error ? error : new Error(String(error)), {
        identifier
      });

      return { allowed: true, remaining: -1, resetAt: new Date() };
    }
  }
}

/**
 * Tiered rate limiter (different limits for different tiers)
 */
export class TieredLimiter {
  private limiters: Map<string, SlidingWindowLimiter> = new Map();

  constructor(
    private tiers: Record<string, RateLimitConfig>,
    private getTierForIdentifier: (identifier: string) => Promise<string>
  ) {
    // Initialize limiters for each tier
    Object.entries(tiers).forEach(([tier, config]) => {
      this.limiters.set(tier, new SlidingWindowLimiter(config));
    });
  }

  /**
   * Check if request is allowed
   */
  async isAllowed(identifier: string): Promise<RateLimitResult> {
    try {
      const tier = await this.getTierForIdentifier(identifier);
      const limiter = this.limiters.get(tier);

      if (!limiter) {
        logger.warn('Unknown tier for identifier', { identifier, tier });
        return { allowed: true, remaining: -1, resetAt: new Date() };
      }

      return limiter.isAllowed(identifier);
    } catch (error) {
      logger.error('Tiered rate limit check failed', error instanceof Error ? error : new Error(String(error)), {
        identifier
      });

      return { allowed: true, remaining: -1, resetAt: new Date() };
    }
  }
}

/**
 * Endpoint-specific rate limiter
 */
export class EndpointLimiter {
  private limiters: Map<string, SlidingWindowLimiter> = new Map();

  /**
   * Register endpoint limit
   */
  registerEndpoint(endpoint: string, config: RateLimitConfig): void {
    this.limiters.set(endpoint, new SlidingWindowLimiter({
      ...config,
      keyPrefix: `sanliurfa:rate_limit:endpoint:${endpoint}:`
    }));
  }

  /**
   * Check if request to endpoint is allowed
   */
  async isAllowed(endpoint: string, identifier: string): Promise<RateLimitResult> {
    const limiter = this.limiters.get(endpoint);

    if (!limiter) {
      logger.warn('Endpoint not registered for rate limiting', { endpoint });
      return { allowed: true, remaining: -1, resetAt: new Date() };
    }

    return limiter.isAllowed(identifier);
  }
}

/**
 * Distributed rate limiter (aggregates multiple limits)
 */
export class DistributedLimiter {
  private globalLimiter: SlidingWindowLimiter;
  private userLimiter: SlidingWindowLimiter;
  private ipLimiter: SlidingWindowLimiter;

  constructor() {
    // Global: 10,000 requests per minute
    this.globalLimiter = new SlidingWindowLimiter({
      windowSizeMs: 60000,
      maxRequests: 10000,
      keyPrefix: 'sanliurfa:rate_limit:global:'
    });

    // Per-user: 100 requests per minute
    this.userLimiter = new SlidingWindowLimiter({
      windowSizeMs: 60000,
      maxRequests: 100,
      keyPrefix: 'sanliurfa:rate_limit:user:'
    });

    // Per-IP: 50 requests per minute (unauthenticated)
    this.ipLimiter = new SlidingWindowLimiter({
      windowSizeMs: 60000,
      maxRequests: 50,
      keyPrefix: 'sanliurfa:rate_limit:ip:'
    });
  }

  /**
   * Check all limits
   */
  async checkLimits(options: {
    userId?: string;
    ipAddress: string;
  }): Promise<{
    allowed: boolean;
    reason?: string;
    limits: Record<string, RateLimitResult>;
  }> {
    const limits: Record<string, RateLimitResult> = {};

    // Check global limit
    limits.global = await this.globalLimiter.isAllowed('global');

    // Check user limit
    if (options.userId) {
      limits.user = await this.userLimiter.isAllowed(options.userId);
    }

    // Check IP limit
    limits.ip = await this.ipLimiter.isAllowed(options.ipAddress);

    // Determine if allowed
    const allowed =
      limits.global.allowed &&
      (!limits.user || limits.user.allowed) &&
      limits.ip.allowed;

    const reason = !limits.global.allowed
      ? 'Global rate limit exceeded'
      : !limits.user?.allowed
      ? 'User rate limit exceeded'
      : !limits.ip.allowed
      ? 'IP rate limit exceeded'
      : undefined;

    return { allowed, reason, limits };
  }
}

/**
 * Global instances
 */
const distributedLimiter = new DistributedLimiter();
const endpointLimiter = new EndpointLimiter();

export function getDistributedLimiter(): DistributedLimiter {
  return distributedLimiter;
}

export function getEndpointLimiter(): EndpointLimiter {
  return endpointLimiter;
}

/**
 * Middleware helper for Express/Astro
 */
export async function checkRateLimit(
  ipAddress: string,
  userId?: string,
  endpoint?: string
): Promise<RateLimitResult> {
  if (endpoint) {
    return endpointLimiter.isAllowed(endpoint, userId || ipAddress);
  }

  const result = await distributedLimiter.checkLimits({ userId, ipAddress });

  if (!result.allowed) {
    logger.warn('Rate limit exceeded', {
      userId,
      ipAddress,
      reason: result.reason
    });
  }

  return result.limits.user || result.limits.ip || result.limits.global;
}
