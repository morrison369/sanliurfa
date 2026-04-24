/**
 * Tier-based Rate Limiting
 * Different rate limits based on subscription/user tier
 */

import type { APIContext } from 'astro';
import { logger } from '../logging';

export type UserTier = 'free' | 'basic' | 'premium' | 'enterprise' | 'admin';

export interface RateLimitConfig {
  requests: number;
  windowMs: number;
  burst?: number;
}

export interface TierLimits {
  default: RateLimitConfig;
  endpoints?: Record<string, RateLimitConfig>;
}

// Rate limits by tier
export const TIER_LIMITS: Record<UserTier, TierLimits> = {
  free: {
    default: { requests: 100, windowMs: 60 * 60 * 1000, burst: 10 }, // 100 req/hour, burst 10
    endpoints: {
      '/api/search': { requests: 30, windowMs: 60 * 1000 }, // 30 req/min
      '/api/places': { requests: 60, windowMs: 60 * 60 * 1000 },
      '/api/reviews': { requests: 20, windowMs: 60 * 60 * 1000 },
    },
  },
  basic: {
    default: { requests: 1000, windowMs: 60 * 60 * 1000, burst: 50 }, // 1000 req/hour
    endpoints: {
      '/api/search': { requests: 100, windowMs: 60 * 1000 },
      '/api/places': { requests: 300, windowMs: 60 * 60 * 1000 },
      '/api/reviews': { requests: 100, windowMs: 60 * 60 * 1000 },
    },
  },
  premium: {
    default: { requests: 10000, windowMs: 60 * 60 * 1000, burst: 100 }, // 10k req/hour
    endpoints: {
      '/api/search': { requests: 500, windowMs: 60 * 1000 },
      '/api/places': { requests: 1000, windowMs: 60 * 60 * 1000 },
      '/api/reviews': { requests: 500, windowMs: 60 * 60 * 1000 },
      '/api/export': { requests: 10, windowMs: 60 * 60 * 1000 },
    },
  },
  enterprise: {
    default: { requests: 100000, windowMs: 60 * 60 * 1000, burst: 500 }, // 100k req/hour
    endpoints: {
      '/api/search': { requests: 2000, windowMs: 60 * 1000 },
      '/api/places': { requests: 5000, windowMs: 60 * 60 * 1000 },
      '/api/reviews': { requests: 2000, windowMs: 60 * 60 * 1000 },
      '/api/export': { requests: 100, windowMs: 60 * 60 * 1000 },
      '/api/webhooks': { requests: 500, windowMs: 60 * 60 * 1000 },
    },
  },
  admin: {
    default: { requests: 1000000, windowMs: 60 * 60 * 1000, burst: 1000 }, // Unlimited practically
    endpoints: {},
  },
};

// Redis key prefix
const RATE_LIMIT_PREFIX = 'ratelimit:tier:';
let tierRateLimitRedisWarned = false;

export interface TierRateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: Date;
  retryAfter?: number;
  tier: UserTier;
}

/**
 * Get rate limit for user tier and endpoint
 */
export function getRateLimitConfig(tier: UserTier, endpoint: string): RateLimitConfig {
  const tierConfig = TIER_LIMITS[tier];
  
  // Check exact match
  if (tierConfig.endpoints?.[endpoint]) {
    return tierConfig.endpoints[endpoint];
  }
  
  // Check pattern match
  for (const [pattern, config] of Object.entries(tierConfig.endpoints || {})) {
    if (pattern.includes('*')) {
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
      if (regex.test(endpoint)) {
        return config;
      }
    }
  }
  
  return tierConfig.default;
}

/**
 * Check tier-based rate limit
 */
export async function checkTierRateLimit(
  userId: string,
  tier: UserTier,
  endpoint: string,
  redis?: any
): Promise<TierRateLimitResult> {
  const config = getRateLimitConfig(tier, endpoint);
  const now = Date.now();
  const windowStart = Math.floor(now / config.windowMs) * config.windowMs;
  const key = `${RATE_LIMIT_PREFIX}${userId}:${endpoint}:${windowStart}`;
  
  // If no Redis, allow (fallback)
  if (!redis) {
    return {
      allowed: true,
      limit: config.requests,
      remaining: config.requests,
      resetAt: new Date(windowStart + config.windowMs),
      tier,
    };
  }
  
  try {
    // Increment counter
    const current = await redis.incr(key);
    
    // Set expiry on first request
    if (current === 1) {
      await redis.pexpire(key, config.windowMs);
    }
    
    const remaining = Math.max(0, config.requests - current);
    const allowed = current <= config.requests;
    
    const result: TierRateLimitResult = {
      allowed,
      limit: config.requests,
      remaining,
      resetAt: new Date(windowStart + config.windowMs),
      tier,
    };
    
    if (!allowed) {
      result.retryAfter = Math.ceil((windowStart + config.windowMs - now) / 1000);
    }
    
    return result;
  } catch (error) {
    // Fail open if Redis error
    const message = error instanceof Error ? `${error.name} ${error.message}` : String(error);
    const lowered = message.toLowerCase();
    const redisIssue =
      lowered.includes('redis') ||
      lowered.includes('socket') ||
      lowered.includes('econnrefused') ||
      lowered.includes('closed') ||
      lowered.includes('connect') ||
      lowered.includes('not open');

    if (redisIssue) {
      if (!tierRateLimitRedisWarned) {
        logger.warn('Tier rate limit Redis unavailable, allowing requests (logging once)');
        tierRateLimitRedisWarned = true;
      }
    } else {
      logger.error('Rate limit check error', error instanceof Error ? error : new Error(message));
    }
    return {
      allowed: true,
      limit: config.requests,
      remaining: config.requests,
      resetAt: new Date(windowStart + config.windowMs),
      tier,
    };
  }
}

/**
 * Get tier from user context
 */
export function getUserTier(context: APIContext): UserTier {
  const user = context.locals.user as any;

  if (!user) return 'free';
  if (user.isAdmin || user.role === 'admin') return 'admin';

  return (user.subscriptionTier as UserTier) || 'free';
}

/**
 * Rate limit headers
 */
export function getRateLimitHeaders(result: TierRateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': Math.floor(result.resetAt.getTime() / 1000).toString(),
    'X-RateLimit-Tier': result.tier,
  };
}

/**
 * Middleware-compatible rate limit check
 */
export async function tierRateLimitMiddleware(
  context: APIContext,
  redis?: any
): Promise<{ allowed: boolean; result?: TierRateLimitResult; headers?: Record<string, string> }> {
  const userId = context.locals.user?.id;
  const endpoint = context.url.pathname;
  
  if (!userId) {
    // Anonymous users - use IP-based limiting (handled separately)
    return { allowed: true };
  }
  
  const tier = getUserTier(context);
  const result = await checkTierRateLimit(userId, tier, endpoint, redis);
  
  if (!result.allowed) {
    return {
      allowed: false,
      result,
      headers: {
        ...getRateLimitHeaders(result),
        'Retry-After': result.retryAfter?.toString() || '60',
      },
    };
  }
  
  return {
    allowed: true,
    result,
    headers: getRateLimitHeaders(result),
  };
}

/**
 * Get tier upgrade message
 */
export function getTierUpgradeMessage(currentTier: UserTier, endpoint: string): string {
  const messages: Record<UserTier, string> = {
    free: 'Bu özelliği daha fazla kullanmak için Basic veya Premium üyeliğe yükseltin.',
    basic: 'Daha yüksek limitler için Premium üyeliğe geçin.',
    premium: 'Enterprise plan için daha yüksek limitler mevcut.',
    enterprise: 'Limit artışı için lütfen destek ekibiyle iletişime geçin.',
    admin: '',
  };
  
  return messages[currentTier] || '';
}

/**
 * Get usage statistics for user
 */
export async function getTierUsageStats(
  userId: string,
  tier: UserTier,
  redis?: any
): Promise<{
  tier: UserTier;
  limits: Record<string, { used: number; limit: number; percentage: number }>;
}> {
  const tierConfig = TIER_LIMITS[tier];
  const stats: Record<string, { used: number; limit: number; percentage: number }> = {};
  
  const now = Date.now();
  
  // Check default limit
  const defaultWindowStart = Math.floor(now / tierConfig.default.windowMs) * tierConfig.default.windowMs;
  const defaultKey = `${RATE_LIMIT_PREFIX}${userId}:default:${defaultWindowStart}`;
  
  if (redis) {
    const defaultUsed = parseInt(await redis.get(defaultKey) || '0', 10);
    stats.default = {
      used: defaultUsed,
      limit: tierConfig.default.requests,
      percentage: Math.round((defaultUsed / tierConfig.default.requests) * 100),
    };
    
    // Check endpoint-specific limits
    for (const [endpoint, config] of Object.entries(tierConfig.endpoints || {})) {
      const windowStart = Math.floor(now / config.windowMs) * config.windowMs;
      const key = `${RATE_LIMIT_PREFIX}${userId}:${endpoint}:${windowStart}`;
      const used = parseInt(await redis.get(key) || '0', 10);
      
      stats[endpoint] = {
        used,
        limit: config.requests,
        percentage: Math.round((used / config.requests) * 100),
      };
    }
  }
  
  return { tier, limits: stats };
}

