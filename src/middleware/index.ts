import { defineMiddleware } from 'astro:middleware';
import { securityHeaders } from './security';
import { performanceOptimizations } from './performance';
import { rateLimitMiddleware, authRateLimitMiddleware } from './rate-limit';

/**
 * Main middleware chain
 * Combines all middleware functions
 */

export const onRequest = defineMiddleware(async (context, next) => {
  const pathname = context.url.pathname;
  
  // Auth endpoints get stricter rate limiting
  if (pathname.startsWith('/api/auth/')) {
    return (authRateLimitMiddleware as any)(context, async () => {
      return (securityHeaders as any)(context, async () => {
        return (performanceOptimizations as any)(context, next);
      });
    });
  }
  
  // Chain middleware: rate limit → security → performance
  return (rateLimitMiddleware as any)(context, async () => {
    return (securityHeaders as any)(context, async () => {
      return (performanceOptimizations as any)(context, next);
    });
  });
});
