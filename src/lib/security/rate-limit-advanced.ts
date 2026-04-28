/**
 * Advanced Rate Limiting
 * IP-based, User-based, and Endpoint-based rate limiting
 */

import type { APIContext } from 'astro';
import { getCache, setCache } from '../cache';

interface RateLimitRule {
  windowMs: number;
  maxRequests: number;
  keyPrefix: string;
}

// Rate limit rules by endpoint type
const RULES: Record<string, RateLimitRule> = {
  // Strict for auth endpoints
  auth: { windowMs: 15 * 60 * 1000, maxRequests: 5, keyPrefix: 'rl:auth' },
  
  // Standard for API
  api: { windowMs: 60 * 1000, maxRequests: 60, keyPrefix: 'rl:api' },
  
  // Generous for public pages
  public: { windowMs: 60 * 1000, maxRequests: 100, keyPrefix: 'rl:public' },
  
  // Strict for admin
  admin: { windowMs: 60 * 1000, maxRequests: 30, keyPrefix: 'rl:admin' },
  
  // For search (expensive operation)
  search: { windowMs: 60 * 1000, maxRequests: 20, keyPrefix: 'rl:search' },
  
  // For file uploads
  upload: { windowMs: 60 * 1000, maxRequests: 5, keyPrefix: 'rl:upload' },
};

interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetTime: number;
  windowMs: number;
}

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
  
  // Fallback to socket address
  return 'unknown';
}

/**
 * Advanced rate limiting with sliding window
 */
export async function rateLimitAdvanced(
  context: APIContext,
  ruleKey: keyof typeof RULES | RateLimitRule,
  identifier?: string
): Promise<RateLimitResult> {
  const rule = typeof ruleKey === 'string' ? RULES[ruleKey] : ruleKey;
  const clientIP = getClientIP(context);
  const key = `${rule.keyPrefix}:${identifier || clientIP}`;
  
  const now = Date.now();
  const windowStart = now - rule.windowMs;
  
  // Get current requests from cache
  const data = await getCache<{ requests: number[] }>(key);
  const requests = data?.requests || [];
  
  // Filter requests within window (sliding window)
  const validRequests = requests.filter(time => time > windowStart);
  
  // Check if allowed
  const allowed = validRequests.length < rule.maxRequests;
  const remaining = Math.max(0, rule.maxRequests - validRequests.length - (allowed ? 1 : 0));
  const resetTime = validRequests.length > 0 
    ? Math.min(...validRequests) + rule.windowMs 
    : now + rule.windowMs;
  
  if (allowed) {
    // Add current request
    validRequests.push(now);
    await setCache(key, { requests: validRequests }, Math.ceil(rule.windowMs / 1000));
  }
  
  return {
    allowed,
    limit: rule.maxRequests,
    remaining,
    resetTime,
    windowMs: rule.windowMs,
  };
}

/**
 * Rate limit by user ID (for authenticated users)
 */
export async function rateLimitByUserAdvanced(
  userId: string,
  ruleKey: keyof typeof RULES | RateLimitRule
): Promise<RateLimitResult> {
  const rule = typeof ruleKey === 'string' ? RULES[ruleKey] : ruleKey;
  const key = `${rule.keyPrefix}:user:${userId}`;
  
  const now = Date.now();
  const windowStart = now - rule.windowMs;
  
  const data = await getCache<{ requests: number[] }>(key);
  const requests = data?.requests || [];
  
  const validRequests = requests.filter(time => time > windowStart);
  
  const allowed = validRequests.length < rule.maxRequests;
  const remaining = Math.max(0, rule.maxRequests - validRequests.length - (allowed ? 1 : 0));
  const resetTime = validRequests.length > 0 
    ? Math.min(...validRequests) + rule.windowMs 
    : now + rule.windowMs;
  
  if (allowed) {
    validRequests.push(now);
    await setCache(key, { requests: validRequests }, Math.ceil(rule.windowMs / 1000));
  }
  
  return {
    allowed,
    limit: rule.maxRequests,
    remaining,
    resetTime,
    windowMs: rule.windowMs,
  };
}

/**
 * Apply rate limit to API endpoint
 */
export async function applyRateLimit(
  context: APIContext,
  ruleKey: keyof typeof RULES | RateLimitRule,
  userId?: string
): Promise<Response | null> {
  const result = userId 
    ? await rateLimitByUserAdvanced(userId, ruleKey)
    : await rateLimitAdvanced(context, ruleKey);
  
  if (!result.allowed) {
    return new Response(
      JSON.stringify({
        error: 'Çok fazla istek gönderdiniz. Lütfen daha sonra tekrar deneyin.',
        retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': result.limit.toString(),
          'X-RateLimit-Remaining': result.remaining.toString(),
          'X-RateLimit-Reset': result.resetTime.toString(),
          'X-RateLimit-Window': result.windowMs.toString(),
          'Retry-After': Math.ceil((result.resetTime - Date.now()) / 1000).toString(),
        },
      }
    );
  }
  
  return null;
}

/**
 * Rate limit middleware for specific endpoints
 */
export function createRateLimitMiddleware(ruleKey: keyof typeof RULES) {
  return async (context: APIContext, next: () => Promise<Response>): Promise<Response> => {
    const userId = context.locals.user?.id;
    const rateLimitResponse = await applyRateLimit(context, ruleKey, userId);
    
    if (rateLimitResponse) {
      return rateLimitResponse;
    }
    
    return next();
  };
}

/**
 * Get rate limit status for client
 */
export async function getRateLimitStatus(
  context: APIContext,
  ruleKey: keyof typeof RULES,
  userId?: string
): Promise<{
  limit: number;
  remaining: number;
  resetTime: number;
}> {
  const result = userId 
    ? await rateLimitByUserAdvanced(userId, ruleKey)
    : await rateLimitAdvanced(context, ruleKey);
  
  return {
    limit: result.limit,
    remaining: result.remaining,
    resetTime: result.resetTime,
  };
}

/**
 * Reset rate limit for IP or user
 */
export async function resetRateLimit(
  identifier: string,
  ruleKey?: keyof typeof RULES
): Promise<void> {
  const { deleteCache } = await import('../cache');
  
  if (ruleKey) {
    const rule = RULES[ruleKey];
    await deleteCache(`${rule.keyPrefix}:${identifier}`);
    await deleteCache(`${rule.keyPrefix}:user:${identifier}`);
  } else {
    // Reset all rules for identifier
    for (const rule of Object.values(RULES)) {
      await deleteCache(`${rule.keyPrefix}:${identifier}`);
      await deleteCache(`${rule.keyPrefix}:user:${identifier}`);
    }
  }
}

/**
 * Check if IP is blocked (too many violations)
 */
export async function isIPBlocked(ip: string): Promise<{ blocked: boolean; until?: number }> {
  const violationsKey = `rl:violations:${ip}`;
  const violations = await getCache<{ count: number; firstViolation: number }>(violationsKey);
  
  if (!violations) {
    return { blocked: false };
  }
  
  // Block if more than 10 violations in 1 hour
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  if (violations.count >= 10 && violations.firstViolation > oneHourAgo) {
    const blockUntil = violations.firstViolation + 60 * 60 * 1000;
    return { blocked: true, until: blockUntil };
  }
  
  return { blocked: false };
}

/**
 * Record rate limit violation
 */
export async function recordViolation(ip: string): Promise<void> {
  const violationsKey = `rl:violations:${ip}`;
  const violations = await getCache<{ count: number; firstViolation: number }>(violationsKey);
  
  if (!violations) {
    await setCache(violationsKey, { count: 1, firstViolation: Date.now() }, 3600);
  } else {
    await setCache(
      violationsKey, 
      { count: violations.count + 1, firstViolation: violations.firstViolation }, 
      3600
    );
  }
}
