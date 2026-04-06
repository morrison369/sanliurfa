import { defineMiddleware } from 'astro:middleware';
import { verifyToken } from '../lib/auth';

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
  
  if (entry.count >= RATE_LIMIT) {
    return false;
  }
  
  entry.count++;
  return true;
}

export const onRequest = defineMiddleware(async (context, next) => {
  const { url, cookies, request } = context;
  const pathname = url.pathname;

  const clientIP = request.headers.get('x-forwarded-for') || 
                   request.headers.get('x-real-ip') || 
                   'unknown';

  if (pathname.startsWith('/api/') && !await checkRateLimit(clientIP)) {
    return new Response(
      JSON.stringify({ error: 'Rate limit exceeded' }),
      { status: 429, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const token = cookies.get('auth-token')?.value;
  let user = null;

  if (token) {
    try {
      user = await verifyToken(token);
      context.locals.user = user;
      context.locals.isAuthenticated = true;
      context.locals.isAdmin = user?.role === 'admin';
    } catch {
      cookies.delete('auth-token', { path: '/' });
      context.locals.isAuthenticated = false;
      context.locals.isAdmin = false;
    }
  } else {
    context.locals.isAuthenticated = false;
    context.locals.isAdmin = false;
  }

  if (pathname.startsWith('/admin')) {
    if (!user || user.role !== 'admin') {
      return context.redirect('/giris?redirect=' + encodeURIComponent(pathname));
    }
  }

  const isProtectedAPI = pathname.startsWith('/api/admin') || 
                         pathname.match(/^\/api\/(blog|places|users)\/[a-z0-9-]+\/(update|delete)$/);
  if (isProtectedAPI && (!user || user.role !== 'admin')) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const response = await next();
  
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self'",
    "connect-src 'self' https://*.supabase.co",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');
  
  response.headers.set('Content-Security-Policy', csp);

  return response;
});

declare global {
  namespace App {
    interface Locals {
      user?: {
        id: string;
        email: string;
        role: string;
      };
      isAuthenticated: boolean;
      isAdmin: boolean;
    }
  }
}
