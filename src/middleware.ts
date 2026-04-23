// Astro Middleware - PostgreSQL JWT Authentication
import { defineMiddleware } from 'astro:middleware';
import { verifyToken } from './lib/auth';
import { queryOne } from './lib/postgres';
import { checkRateLimit } from './lib/cache';
import { PUBLIC_DISCOVERY_PATHS } from './lib/public-discovery';
import { logger } from './lib/logging';

// Public paths that don't require authentication
const PUBLIC_PATHS = [
  '/', '/giris', '/kayit', '/places', '/tarihi-yerler', '/blog',
  '/gastronomi', '/arama', '/hakkinda', '/iletisim', '/etkinlikler',
  '/sehir-servisleri', '/kullanici', '/kullanicilar', '/kesfet',
  '/siralamalar', '/liderlik-tablosu', '/trend', '/oneriler',
  '/fiyatlandirma', '/gizlilik-politikasi', '/kullanim-kosullari', '/kvkk',
  '/cerez-politikasi', '/sss', '/sifremi-unuttum', '/sifre-sifirla', '/verify-email', '/loading',
  '/search', '/favorites', '/mekanlar', '/hakkimizda', '/profile', '/notifications',
  ...PUBLIC_DISCOVERY_PATHS,
  '/api/auth/login', '/api/auth/register', '/api/places', '/api/health',
];

// Admin only paths
const ADMIN_PATHS = ['/admin'];

const CANONICAL_ORIGIN = 'https://sanliurfa.com';
const CANONICAL_HOST = 'sanliurfa.com';
const NODE_ENV = (process.env.NODE_ENV || 'development').toLowerCase();
const IS_PRODUCTION = NODE_ENV === 'production';

// CORS configuration
const CORS_ORIGINS = (() => {
  const configuredOrigins = (process.env.CORS_ORIGINS || CANONICAL_ORIGIN)
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  const origins = new Set(configuredOrigins.length > 0 ? configuredOrigins : [CANONICAL_ORIGIN]);
  if (!IS_PRODUCTION) {
    origins.add('http://localhost:4321');
    origins.add('http://127.0.0.1:4321');
  }
  return origins;
})();
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

function canonicalRedirectUrl(url: URL, request: Request): string | null {
  const host = url.hostname.toLowerCase();
  if (isLocalOrPrivateHost(host)) {
    return null;
  }

  if (!IS_PRODUCTION && host !== CANONICAL_HOST && host !== `www.${CANONICAL_HOST}`) {
    return null;
  }

  const forwardedProto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim().toLowerCase();
  const effectiveProtocol = forwardedProto || url.protocol.replace(':', '');
  const needsHostRedirect = host !== CANONICAL_HOST;
  const needsProtocolRedirect = effectiveProtocol !== 'https';

  if (!needsHostRedirect && !needsProtocolRedirect) {
    return null;
  }

  return `${CANONICAL_ORIGIN}${url.pathname}${url.search}`;
}

function legacyPathRedirectUrl(url: URL): string | null {
  let decodedPathname = url.pathname;
  try {
    decodedPathname = decodeURIComponent(url.pathname);
  } catch {
    return null;
  }
  const legacyRules: Array<[RegExp, string]> = [
    [/^\/search\/?$/u, '/arama'],
    [/^\/favorites\/?$/u, '/profil/favoriler'],
    [/^\/mekanlar\/?$/u, '/places'],
    [/^\/hakkimizda\/?$/u, '/hakkinda'],
    [/^\/profile\/?$/u, '/profil'],
    [/^\/notifications\/?$/u, '/bildirimler'],
    [/^\/kullanıcılar\/?$/u, '/kullanicilar'],
    [/^\/kullanıcı(\/.*)?$/u, '/kullanici$1'],
    [/^\/işletme(\/.*)?$/u, '/isletme$1'],
    [/^\/veri-ambarı(\/.*)?$/u, '/veri-ambari$1'],
  ];

  for (const [pattern, replacement] of legacyRules) {
    if (pattern.test(decodedPathname)) {
      return decodedPathname.replace(pattern, replacement) + url.search;
    }
  }

  return null;
}

function isLocalOrPrivateHost(host: string): boolean {
  if (host === 'localhost' || host === '127.0.0.1' || host === '::1' || host.endsWith('.local')) {
    return true;
  }

  // IPv4 private network ranges
  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)) {
    return true;
  }
  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(host)) {
    return true;
  }
  if (/^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(host)) {
    return true;
  }

  return false;
}

export const onRequest = defineMiddleware(async (context, next) => {
  const { url, cookies, request } = context;
  const pathname = url.pathname;
  const redirectUrl = canonicalRedirectUrl(url, request);

  if (redirectUrl) {
    return Response.redirect(redirectUrl, 301);
  }

  const legacyRedirectUrl = legacyPathRedirectUrl(url);
  if (legacyRedirectUrl) {
    return Response.redirect(new URL(legacyRedirectUrl, url), 301);
  }

  // Check if path is public
  const isPublicPath = PUBLIC_PATHS.some(path => pathname === path || pathname.startsWith(path + '/'));

  // Check if path is admin only
  const isAdminPath = ADMIN_PATHS.some(path => pathname === path || pathname.startsWith(path + '/'));

  // Handle CORS preflight for API routes
  if (pathname.startsWith('/api/') && request.method === 'OPTIONS') {
    const origin = request.headers.get('Origin');
    const corsHeaders: Record<string, string> = {};

    if (origin && CORS_ORIGINS.has(origin)) {
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
      logger.error('Auth middleware error', err instanceof Error ? err : new Error(String(err)), {
        pathname
      });
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
  response.headers.set('Content-Language', 'tr');
  response.headers.set('X-Default-Charset', 'utf-8');

  const contentType = response.headers.get('Content-Type');
  if (contentType?.startsWith('application/json') && !/charset=/i.test(contentType)) {
    response.headers.set('Content-Type', 'application/json; charset=utf-8');
  }

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
    if (origin && CORS_ORIGINS.has(origin)) {
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
        isAdmin?: boolean;
      } | null;
      isAdmin: boolean;
      isAuthenticated: boolean;
    }
  }
}
