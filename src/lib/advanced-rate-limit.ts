/**
 * Advanced rate limiting with multiple strategies
 * Supports global limits, per-user limits, per-endpoint limits, and burst handling
 */

import { getRedisClient as getPrimaryRedisClient, prefixKey } from './cache';
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

const RATE_LIMIT_ERROR_LOG_TTL_MS = 60000;
const rateLimitErrorLogMap = new Map<string, number>();

function shouldLogRateLimitError(signature: string): boolean {
  const now = Date.now();
  const lastLoggedAt = rateLimitErrorLogMap.get(signature) || 0;
  if (now - lastLoggedAt < RATE_LIMIT_ERROR_LOG_TTL_MS) {
    return false;
  }
  rateLimitErrorLogMap.set(signature, now);
  return true;
}

async function getRateLimitRedisClient(): Promise<any | null> {
  try {
    return (await getPrimaryRedisClient()) as any;
  } catch {
    return null;
  }
}

async function redisZRemRangeByScore(client: any, key: string, min: number, max: number): Promise<void> {
  if (typeof client?.zRemRangeByScore === 'function') {
    await client.zRemRangeByScore(key, min, max);
    return;
  }
  if (typeof client?.zremrangebyscore === 'function') {
    await client.zremrangebyscore(key, min, max);
    return;
  }
  throw new Error('Redis client missing zRemRangeByScore');
}

async function redisZCard(client: any, key: string): Promise<number> {
  if (typeof client?.zCard === 'function') {
    return Number(await client.zCard(key));
  }
  if (typeof client?.zcard === 'function') {
    return Number(await client.zcard(key));
  }
  throw new Error('Redis client missing zCard');
}

async function redisZRange(client: any, key: string, start: number, stop: number): Promise<string[]> {
  if (typeof client?.zRange === 'function') {
    return (await client.zRange(key, start, stop)) || [];
  }
  if (typeof client?.zrange === 'function') {
    return (await client.zrange(key, start, stop)) || [];
  }
  throw new Error('Redis client missing zRange');
}

async function redisZAdd(client: any, key: string, score: number, value: string): Promise<void> {
  if (typeof client?.zAdd === 'function') {
    await client.zAdd(key, [{ score, value }]);
    return;
  }
  if (typeof client?.zadd === 'function') {
    await client.zadd(key, score, value);
    return;
  }
  throw new Error('Redis client missing zAdd');
}

async function redisSetEx(client: any, key: string, ttlSeconds: number, value: string): Promise<void> {
  if (typeof client?.setEx === 'function') {
    await client.setEx(key, ttlSeconds, value);
    return;
  }
  if (typeof client?.setex === 'function') {
    await client.setex(key, ttlSeconds, value);
    return;
  }
  throw new Error('Redis client missing setEx');
}

/**
 * Sliding window rate limiter (most accurate)
 */
export class SlidingWindowLimiter {
  private config: RateLimitConfig;
  private fallbackWindows = new Map<string, number[]>();

  constructor(config: RateLimitConfig) {
    this.config = {
      keyPrefix: 'rate_limit:sw:',
      ...config
    };
  }

  /**
   * Check if request is allowed
   */
  async isAllowed(identifier: string): Promise<RateLimitResult> {
    const redis = await getRateLimitRedisClient();
    if (!redis) {
      return this.applyInMemoryFallback(identifier);
    }

    const key = prefixKey(`${this.config.keyPrefix}${identifier}`);
    const now = Date.now();
    const windowStart = now - this.config.windowSizeMs;

    try {
      // Remove old entries outside the window
      await redisZRemRangeByScore(redis, key, 0, windowStart);

      // Count requests in current window
      const count = await redisZCard(redis, key);

      if (count >= this.config.maxRequests) {
        // At limit - calculate retry after
        const oldestRequest = await redisZRange(redis, key, 0, 0);
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
      await redisZAdd(redis, key, now, `${now}-${Math.random()}`);
      await redis.expire(key, Math.ceil(this.config.windowSizeMs / 1000));

      return {
        allowed: true,
        remaining: this.config.maxRequests - count - 1,
        resetAt: new Date(now + this.config.windowSizeMs)
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (shouldLogRateLimitError(`sliding_window:${message}`)) {
        logger.warn('Rate limit check degraded to in-memory fallback', {
          identifier,
          method: 'sliding_window',
          error: message
        });
      }

      return this.applyInMemoryFallback(identifier);
    }
  }

  private applyInMemoryFallback(identifier: string): RateLimitResult {
    const now = Date.now();
    const windowStart = now - this.config.windowSizeMs;
    const bucket = this.fallbackWindows.get(identifier) || [];
    const filtered = bucket.filter(ts => ts > windowStart);

    if (filtered.length >= this.config.maxRequests) {
      const oldest = filtered[0] || now;
      const retryAfter = Math.ceil((oldest + this.config.windowSizeMs - now) / 1000);

      this.fallbackWindows.set(identifier, filtered);
      this.cleanupFallbackWindowMap(now);
      return {
        allowed: false,
        remaining: 0,
        resetAt: new Date(oldest + this.config.windowSizeMs),
        retryAfter
      };
    }

    filtered.push(now);
    this.fallbackWindows.set(identifier, filtered);
    this.cleanupFallbackWindowMap(now);

    return {
      allowed: true,
      remaining: this.config.maxRequests - filtered.length,
      resetAt: new Date(now + this.config.windowSizeMs)
    };
  }

  private cleanupFallbackWindowMap(nowMs: number): void {
    if (this.fallbackWindows.size < 5000) {
      return;
    }

    const minActiveTs = nowMs - (this.config.windowSizeMs * 2);
    for (const [key, timestamps] of this.fallbackWindows.entries()) {
      if (timestamps.length === 0 || timestamps[timestamps.length - 1] < minActiveTs) {
        this.fallbackWindows.delete(key);
      }
    }
  }
}

/**
 * Token bucket rate limiter (allows bursts)
 */
export class TokenBucketLimiter {
  private config: RateLimitConfig & { refillRatePerSecond: number };
  private fallbackBuckets = new Map<string, { tokens: number; lastRefill: number }>();

  constructor(config: RateLimitConfig & { refillRatePerSecond?: number }) {
    this.config = {
      keyPrefix: 'rate_limit:tb:',
      refillRatePerSecond: config.maxRequests / (config.windowSizeMs / 1000),
      ...config
    };
  }

  /**
   * Check if request is allowed (and consume tokens)
   */
  async isAllowed(identifier: string): Promise<RateLimitResult> {
    const redis = await getRateLimitRedisClient();
    if (!redis) {
      return this.applyInMemoryFallback(identifier);
    }

    const key = prefixKey(`${this.config.keyPrefix}${identifier}`);
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
          redisSetEx(redis, key, ttl, tokens.toString()),
          redisSetEx(redis, lastRefillKey, ttl, now.toString())
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
      const message = error instanceof Error ? error.message : String(error);
      if (shouldLogRateLimitError(`token_bucket:${message}`)) {
        logger.warn('Token bucket degraded to in-memory fallback', {
          identifier,
          method: 'token_bucket',
          error: message
        });
      }

      return this.applyInMemoryFallback(identifier);
    }
  }

  private applyInMemoryFallback(identifier: string): RateLimitResult {
    const now = Date.now() / 1000;
    const current = this.fallbackBuckets.get(identifier) || {
      tokens: this.config.maxRequests,
      lastRefill: now
    };

    const elapsedSeconds = now - current.lastRefill;
    const refilled = Math.min(
      this.config.maxRequests,
      current.tokens + (elapsedSeconds * this.config.refillRatePerSecond)
    );

    if (refilled >= 1) {
      const tokensAfter = refilled - 1;
      this.fallbackBuckets.set(identifier, { tokens: tokensAfter, lastRefill: now });
      this.cleanupFallbackBucketMap(now);
      return {
        allowed: true,
        remaining: Math.floor(tokensAfter),
        resetAt: new Date((now * 1000) + this.config.windowSizeMs)
      };
    }

    const retryAfter = Math.ceil((1 - refilled) / this.config.refillRatePerSecond);
    this.fallbackBuckets.set(identifier, { tokens: refilled, lastRefill: now });
    this.cleanupFallbackBucketMap(now);
    return {
      allowed: false,
      remaining: 0,
      resetAt: new Date((now + retryAfter) * 1000),
      retryAfter
    };
  }

  private cleanupFallbackBucketMap(nowSeconds: number): void {
    if (this.fallbackBuckets.size < 5000) {
      return;
    }

    const staleBefore = nowSeconds - ((this.config.windowSizeMs / 1000) * 2);
    for (const [key, bucket] of this.fallbackBuckets.entries()) {
      if (bucket.lastRefill < staleBefore) {
        this.fallbackBuckets.delete(key);
      }
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
      const message = error instanceof Error ? error.message : String(error);
      if (shouldLogRateLimitError(`tiered:${message}`)) {
        logger.warn('Tiered rate limit degraded, allowing request', {
          identifier,
          error: message
        });
      }

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
      keyPrefix: `rate_limit:endpoint:${endpoint}:`
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
      keyPrefix: 'rate_limit:global:'
    });

    // Per-user: 100 requests per minute
    this.userLimiter = new SlidingWindowLimiter({
      windowSizeMs: 60000,
      maxRequests: 100,
      keyPrefix: 'rate_limit:user:'
    });

    // Per-IP: 50 requests per minute (unauthenticated)
    this.ipLimiter = new SlidingWindowLimiter({
      windowSizeMs: 60000,
      maxRequests: 50,
      keyPrefix: 'rate_limit:ip:'
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
