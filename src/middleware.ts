// Astro Middleware - PostgreSQL JWT Authentication
import { defineMiddleware } from 'astro:middleware';
import { verifyToken } from './lib/auth';
import { queryOne } from './lib/postgres';
import { checkRateLimit } from './lib/cache';

// Public paths that don't require authentication
const PUBLIC_PATHS = [
  '/', '/giris', '/kayit', '/places', '/tarihi-yerler', '/blog',
  '/gastronomi', '/arama', '/hakkinda', '/iletisim',
  '/api/auth/login', '/api/auth/register', '/api/places', '/api/health',
];

// Admin only paths
const ADMIN_PATHS = ['/admin'];

// CORS configuration
const CORS_ORIGINS = (process.env.CORS_ORIGINS || 'https://sanliurfa.com').split(',').map(o => o.trim());
const RATE_LIMIT = 100;
const RATE_LIMIT_WINDOW = 15 * 60; // 15 minutes in seconds

const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
};

/**
 * Extract client IP from request headers
 * Handles proxy headers and prevents IP spoofing by using rightmost IP
 */
function getClientIP(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const xRealIp = request.headers.get('x-real-ip');

  if (forwarded) {
    // x-forwarded-for can be comma-separated list; use rightmost (closest to our server)
    const ips = forwarded.split(',').map(ip => ip.trim());
    return ips[ips.length - 1] || 'unknown';
  }

  return xRealIp || 'unknown';
}

export const onRequest = defineMiddleware(async (context, next) => {
  const { url, cookies, request } = context;
  const pathname = url.pathname;

  // Check if path is public
  const isPublicPath = PUBLIC_PATHS.some(path => pathname === path || pathname.startsWith(path + '/'));

  // Check if path is admin only
  const isAdminPath = ADMIN_PATHS.some(path => pathname === path || pathname.startsWith(path + '/'));

  // Handle CORS preflight for API routes
  if (pathname.startsWith('/api/') && request.method === 'OPTIONS') {
    const origin = request.headers.get('Origin');
    const corsHeaders: Record<string, string> = {};

    if (origin && CORS_ORIGINS.includes(origin)) {
      corsHeaders['Access-Control-Allow-Origin'] = origin;
      corsHeaders['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
      corsHeaders['Access-Control-Allow-Headers'] = 'Content-Type, Authorization';
      corsHeaders['Access-Control-Allow-Credentials'] = 'true';
      corsHeaders['Access-Control-Max-Age'] = '86400';
    }

    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // Rate limiting for API (using Redis)
  const clientIP = getClientIP(request);

  if (pathname.startsWith('/api/')) {
    const isAllowed = await checkRateLimit(clientIP, RATE_LIMIT, RATE_LIMIT_WINDOW);
    if (!isAllowed) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded', retryAfter: RATE_LIMIT_WINDOW }), {
        status: 429,
        headers: { 'Content-Type': 'application/json', 'Retry-After': String(RATE_LIMIT_WINDOW) }
      });
    }
  }

  // Get token from cookies (using auth-token)
  const token = cookies.get('auth-token')?.value;
  
  // Set default user in locals
  context.locals.user = null;
  context.locals.isAdmin = false;
  context.locals.isAuthenticated = false;

  // Validate session if token exists
  if (token) {
    try {
      const tokenData = await verifyToken(token);

      if (tokenData && tokenData.userId) {
        // Get user from database
        const user = await queryOne('SELECT id, email, full_name, role, avatar_url, points FROM users WHERE id = $1', [tokenData.userId]);

        if (user) {
          context.locals.user = {
            id: user.id,
            email: user.email,
            fullName: user.full_name,
            role: user.role,
            avatar: user.avatar_url,
            points: user.points || 0,
          };
          context.locals.isAdmin = user.role === 'admin' || user.role === 'moderator';
          context.locals.isAuthenticated = true;

          // Check admin access
          if (isAdminPath && !context.locals.isAdmin) {
            return context.redirect('/?error=unauthorized');
          }
        }
      }
    } catch (err) {
      console.error('Auth middleware error:', err);
      cookies.delete('auth-token', { path: '/' });
      
      if (!isPublicPath) {
        return context.redirect('/giris?error=session_error');
      }
    }
  }

  // If no token and path requires auth, redirect to login
  if (!token && !isPublicPath && !pathname.startsWith('/api/')) {
    return context.redirect('/giris?redirect=' + encodeURIComponent(pathname));
  }

  const response = await next();

  // Add security headers
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  // Content Security Policy
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self'",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; ');

  response.headers.set('Content-Security-Policy', csp);

  // Add CORS headers for API routes if origin is allowed
  if (pathname.startsWith('/api/')) {
    const origin = request.headers.get('Origin');
    if (origin && CORS_ORIGINS.includes(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin);
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      response.headers.set('Access-Control-Allow-Credentials', 'true');
    }
  }

  return response;
});

// Declare module for TypeScript
declare global {
  namespace App {
    interface Locals {
      user: {
        id: string;
        email: string;
        fullName: string;
        role: 'user' | 'admin' | 'moderator';
        avatar: string | null;
        points: number;
      } | null;
      isAdmin: boolean;
      isAuthenticated: boolean;
    }
  }
}
