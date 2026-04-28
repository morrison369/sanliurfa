import type { MiddlewareHandler } from 'astro';

/**
 * Rate Limiting Middleware
 * Simple in-memory rate limiting for CWP shared hosting
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimits = new Map<string, RateLimitEntry>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX = 100; // 100 requests per minute

// Clean up old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimits.entries()) {
    if (now > entry.resetTime) {
      rateLimits.delete(key);
    }
  }
}, 300000);

export const rateLimitMiddleware: MiddlewareHandler = async (context, next) => {
  // Skip rate limiting for static assets
  const pathname = context.url.pathname;
  if (pathname.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$/)) {
    return next();
  }

  // Get client IP
  const ip = context.request.headers.get('x-forwarded-for') || 
             context.request.headers.get('x-real-ip') || 
             'unknown';
  
  const now = Date.now();
  const key = `${ip}:${pathname}`;
  
  const entry = rateLimits.get(key);
  
  if (entry) {
    if (now > entry.resetTime) {
      // Reset window
      rateLimits.set(key, {
        count: 1,
        resetTime: now + RATE_LIMIT_WINDOW
      });
    } else if (entry.count >= RATE_LIMIT_MAX) {
      // Rate limit exceeded
      return new Response(
        JSON.stringify({
          error: 'Too Many Requests',
          message: 'Rate limit exceeded. Please try again later.',
          retryAfter: Math.ceil((entry.resetTime - now) / 1000)
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(Math.ceil((entry.resetTime - now) / 1000))
          }
        }
      );
    } else {
      // Increment count
      entry.count++;
    }
  } else {
    // New entry
    rateLimits.set(key, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW
    });
  }

  return next();
};

// Stricter rate limiting for auth endpoints
export const authRateLimitMiddleware: MiddlewareHandler = async (context, next) => {
  const ip = context.request.headers.get('x-forwarded-for') || 
             context.request.headers.get('x-real-ip') || 
             'unknown';
  
  const now = Date.now();
  const key = `auth:${ip}`;
  const AUTH_RATE_LIMIT = 10; // 10 attempts per minute
  
  const entry = rateLimits.get(key);
  
  if (entry) {
    if (now > entry.resetTime) {
      rateLimits.set(key, {
        count: 1,
        resetTime: now + RATE_LIMIT_WINDOW
      });
    } else if (entry.count >= AUTH_RATE_LIMIT) {
      return new Response(
        JSON.stringify({
          error: 'Too Many Requests',
          message: 'Too many authentication attempts. Please try again later.',
          retryAfter: Math.ceil((entry.resetTime - now) / 1000)
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(Math.ceil((entry.resetTime - now) / 1000))
          }
        }
      );
    } else {
      entry.count++;
    }
  } else {
    rateLimits.set(key, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW
    });
  }

  return next();
};
