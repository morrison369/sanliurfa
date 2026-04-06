// Astro Middleware - PostgreSQL JWT Authentication
import { defineMiddleware } from 'astro:middleware';
import { verifyToken } from './lib/auth';
import { queryOne } from './lib/postgres';

// Public paths that don't require authentication
const PUBLIC_PATHS = [
  '/', '/giris', '/kayit', '/places', '/tarihi-yerler', '/blog',
  '/gastronomi', '/arama', '/hakkinda', '/iletisim',
  '/api/auth/login', '/api/auth/register', '/api/places',
];

// Admin only paths
const ADMIN_PATHS = ['/admin'];

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();
const RATE_LIMIT = 100;
const RATE_LIMIT_WINDOW = 15 * 60 * 1000;

const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
};

async function checkRateLimit(ip: string): Promise<boolean> {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  
  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }
  
  if (entry.count >= RATE_LIMIT) return false;
  
  entry.count++;
  return true;
}

export const onRequest = defineMiddleware(async (context, next) => {
  const { url, cookies, request } = context;
  const pathname = url.pathname;

  // Check if path is public
  const isPublicPath = PUBLIC_PATHS.some(path => 
    pathname === path || pathname.startsWith(path + '/')
  );

  // Check if path is admin only
  const isAdminPath = ADMIN_PATHS.some(path => 
    pathname === path || pathname.startsWith(path + '/')
  );

  // Rate limiting for API
  const clientIP = request.headers.get('x-forwarded-for') || 
                   request.headers.get('x-real-ip') || 'unknown';

  if (pathname.startsWith('/api/') && !await checkRateLimit(clientIP)) {
    return new Response(
      JSON.stringify({ error: 'Rate limit exceeded' }),
      { status: 429, headers: { 'Content-Type': 'application/json' } }
    );
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
      
      if (tokenData && tokenData.id) {
        // Get user from database
        const user = await queryOne('SELECT id, email, full_name, role, avatar_url, points FROM users WHERE id = $1', [tokenData.id]);

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
    "form-action 'self'",
  ].join('; ');
  
  response.headers.set('Content-Security-Policy', csp);

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
