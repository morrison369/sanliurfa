/**
 * Rate Limiting Middleware
 * Protects against abuse and DDoS attacks
 */

import type { APIContext } from 'astro';
import { getCache, setCache } from '../cache';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyPrefix?: string;
}

// Default configurations
const DEFAULT_CONFIGS: Record<string, RateLimitConfig> = {
  strict: { windowMs: 60 * 1000, maxRequests: 10 },      // 10 req/min
  standard: { windowMs: 60 * 1000, maxRequests: 60 },    // 60 req/min
  generous: { windowMs: 60 * 1000, maxRequests: 100 },   // 100 req/min
  auth: { windowMs: 15 * 60 * 1000, maxRequests: 5 },    // 5 login attempts per 15 min
};

/**
 * Get client IP address
 */
function getClientIP(context: APIContext): string {
  const forwarded = context.request.headers.get('x-forwarded-for');
  const realIP = context.request.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIP) {
    return realIP;
  }
  
  return 'unknown';
}

/**
 * Rate limiting middleware
 */
export async function rateLimit(
  context: APIContext,
  config: RateLimitConfig | string = 'standard'
): Promise<{ allowed: boolean; limit: number; remaining: number; resetTime: number }> {
  const cfg = typeof config === 'string' ? DEFAULT_CONFIGS[config] : config;
  const clientIP = getClientIP(context);
  const key = `ratelimit:${cfg.keyPrefix || 'default'}:${clientIP}`;
  
  const now = Date.now();
  const windowStart = now - cfg.windowMs;
  
  // Get current requests
  const data = await getCache<{ requests: number[] }>(key);
  const requests = data?.requests || [];
  
  // Filter requests within window
  const validRequests = requests.filter(time => time > windowStart);
  
  const limit = cfg.maxRequests;
  const currentCount = validRequests.length;
  const allowed = currentCount < limit;
  const remaining = Math.max(0, limit - currentCount - (allowed ? 1 : 0));
  const resetTime = validRequests.length > 0 
    ? Math.min(...validRequests) + cfg.windowMs 
    : now + cfg.windowMs;
  
  if (allowed) {
    validRequests.push(now);
    await setCache(key, { requests: validRequests }, cfg.windowMs / 1000);
  }
  
  return { allowed, limit, remaining, resetTime };
}

/**
 * Apply rate limit to API endpoint
 */
export async function applyRateLimit(
  context: APIContext,
  config: RateLimitConfig | string = 'standard'
): Promise<Response | null> {
  const result = await rateLimit(context, config);
  
  if (!result.allowed) {
    return new Response(
      JSON.stringify({
        error: 'Too many requests',
        retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': result.limit.toString(),
          'X-RateLimit-Remaining': result.remaining.toString(),
          'X-RateLimit-Reset': result.resetTime.toString(),
          'Retry-After': Math.ceil((result.resetTime - Date.now()) / 1000).toString(),
        },
      }
    );
  }
  
  // Add rate limit headers to successful response
  context.locals.rateLimit = result;
  return null;
}

/**
 * Rate limit by user ID (for authenticated requests)
 */
export async function rateLimitByUser(
  userId: string,
  config: RateLimitConfig | string = 'standard'
): Promise<{ allowed: boolean; remaining: number }> {
  const cfg = typeof config === 'string' ? DEFAULT_CONFIGS[config] : config;
  const key = `ratelimit:user:${userId}`;
  
  const now = Date.now();
  const windowStart = now - cfg.windowMs;
  
  const data = await getCache<{ requests: number[] }>(key);
  const requests = data?.requests || [];
  const validRequests = requests.filter(time => time > windowStart);
  
  const currentCount = validRequests.length;
  const allowed = currentCount < cfg.maxRequests;
  const remaining = Math.max(0, cfg.maxRequests - currentCount - (allowed ? 1 : 0));
  
  if (allowed) {
    validRequests.push(now);
    await setCache(key, { requests: validRequests }, cfg.windowMs / 1000);
  }
  
  return { allowed, remaining };
}
