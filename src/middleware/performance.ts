import type { MiddlewareHandler } from 'astro';

/**
 * Performance Optimization Middleware
 * Adds performance-related headers and optimizations
 */

export const performanceOptimizations: MiddlewareHandler = async (context, next) => {
  const startTime = Date.now();
  const response = await next();
  const duration = Date.now() - startTime;
  
  const headers = new Headers(response.headers);
  
  // Add Server-Timing header for debugging
  if (process.env.NODE_ENV === 'development') {
    headers.set('Server-Timing', `total;dur=${duration}`);
  }
  
  // Resource hints for critical assets
  if (context.url.pathname === '/') {
    // Preconnect to external domains
    headers.set('Link', '<https://fonts.googleapis.com>; rel=preconnect, <https://fonts.gstatic.com>; rel=preconnect; crossorigin');
  }
  
  // Compression is handled by nginx, but add vary header
  headers.set('Vary', 'Accept-Encoding');
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
};

/**
 * Generate critical CSS for above-the-fold content
 */
export function generateCriticalCSS(): string {
  return `
    /* Critical CSS - Above the fold */
    *,*::before,*::after{box-sizing:border-box}
    html{font-family:system-ui,sans-serif;line-height:1.5;-webkit-text-size-adjust:100%}
    body{margin:0;font-family:'Inter',system-ui,sans-serif}
    img{max-width:100%;height:auto;display:block}
    .container{width:100%;max-width:1200px;margin:0 auto;padding:0 1rem}
    .sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border-width:0}
  `.replace(/\s+/g, ' ').trim();
}
