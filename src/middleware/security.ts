// Security middleware - CSP, Security Headers
import type { MiddlewareHandler } from 'astro';
function getCanonicalOrigin(): string {
  return process.env.SITE_URL || process.env.PUBLIC_SITE_URL || 'https://sanliurfa.com';
}
function getAllowedOriginsFromEnv(raw?: string): string[] {
  if (!raw) return [];
  return raw.split(',').map(o => o.trim()).filter(Boolean);
}

const canonicalOrigin = getCanonicalOrigin();
const allowedOrigins = getAllowedOriginsFromEnv(
  process.env.CORS_ORIGINS || process.env.SITE_URL || process.env.PUBLIC_SITE_URL || canonicalOrigin,
);

export const securityHeaders: MiddlewareHandler = async (context, next) => {
  const response = await next();
  
  // Content Security Policy
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://analytics.sanliurfa.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: https: blob:",
    "font-src 'self' https://fonts.gstatic.com",
    "connect-src 'self' https://api.sanliurfa.com https://analytics.sanliurfa.com",
    "media-src 'self' https: blob:",
    "frame-src 'self' https://www.youtube.com https://www.google.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join('; ');

  // Set security headers
  response.headers.set('Content-Security-Policy', csp);
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self)');
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  
  // Remove server fingerprinting
  response.headers.delete('X-Powered-By');
  response.headers.delete('Server');
  
  // CORS headers for API routes
  if (context.url.pathname.startsWith('/api/')) {
    const requestOrigin = context.request.headers.get('origin');
    const selectedOrigin =
      requestOrigin && allowedOrigins.includes(requestOrigin)
        ? requestOrigin
        : canonicalOrigin;
    response.headers.set('Access-Control-Allow-Origin', selectedOrigin);
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    response.headers.set('Access-Control-Max-Age', '86400');
    response.headers.set('Vary', 'Origin');
  }
  
  return response;
};
