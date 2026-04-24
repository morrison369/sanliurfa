// Astro Middleware - PostgreSQL JWT Authentication
import { defineMiddleware } from 'astro:middleware';
import { verifyToken } from './lib/auth';
import { queryOne } from './lib/postgres';
import { checkRateLimit } from './lib/cache';
import { getRedisClient, prefixKey } from './lib/cache/cache';
function getCanonicalDomain(): string {
  return process.env.SITE_URL || process.env.PUBLIC_SITE_URL || 'https://sanliurfa.com';
}
function getAllowedOriginsFromEnv(raw?: string): string[] {
  if (!raw) return [];
  return raw.split(',').map(o => o.trim()).filter(Boolean);
}

// Public paths that don't require authentication
const PUBLIC_PATHS = [
  '/', '/giris', '/kayit', '/places', '/tarihi-yerler', '/blog',
  '/gastronomi', '/arama', '/hakkinda', '/iletisim', '/etkinlikler',
  '/gizlilik-politikasi', '/kullanim-kosullari', '/kvkk', '/hakkimizda',
  '/fiyatlandirma', '/sss', '/cerez-politikasi', '/404', '/500', '/loading',
  '/mekanlar', '/ilceler', '/gezilecek-yerler', '/saglik', '/mahalleler', '/yeme-icme',
  '/topluluk', '/eslesme', '/yemek-tarifleri',
  '/egitim', '/ulasim', '/alisveris', '/hizmetler', '/emlak', '/konaklama', '/etkinlikler', '/isletme',
  '/harita', '/kesfet',
  '/en-iyi-kebapcilar', '/en-iyi-cigerciler', '/sanliurfa-kahvalti-mekanlari',
  '/sanliurfa-sira-gecesi-mekanlari', '/sanliurfa-gece-acik-mekanlar',
  '/sanliurfada-ne-yenir', '/bugun-sanliurfada-ne-yapilir',
  '/api/auth/login', '/api/auth/register', '/api/auth/forgot-password',
  '/api/auth/reset-password', '/api/auth/callback',
  '/api/places', '/api/health',
  '/api/contact', '/api/reviews', '/api/hashtags', '/api/leaderboards',
  '/api/saglik/nobetci', '/api/places/apply',
  '/isletme-kayit', '/ara',
  '/kullanicilar', '/trend', '/siralamalar', '/liderlik-tablosu', '/oneriler',
  '/sitemap.xml', '/sitemap-dynamic.xml', '/sitemap-index.xml', '/rss.xml', '/robots.txt', '/llms.txt',
];

// Admin only paths
const ADMIN_PATHS = ['/admin'];

// CORS configuration
const CORS_ORIGINS = getAllowedOriginsFromEnv(process.env.CORS_ORIGINS);
const RATE_LIMIT = 100;
const RATE_LIMIT_WINDOW = 15 * 60; // 15 minutes in seconds

const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
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
  const canonicalHost = getCanonicalDomain();
  const requestId =
    request.headers.get('x-request-id') ||
    `req-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

  // Health endpointleri her koşulda hızlı ve fail-open çalışmalı.
  if (pathname === '/api/health' || pathname === '/api/health/schema-ready') {
    const response = await next();
    response.headers.set('X-Request-ID', requestId);
    return response;
  }

  // Canonical domain and URL aliases (SEO-safe 301 redirects)
  const aliasRedirects: Record<string, string> = {
    '/ara': '/arama',
    '/gizlilik': '/gizlilik-politikasi',
    '/kosullar': '/kullanim-kosullari',
    '/mekan': '/mekanlar',
    '/places': '/mekanlar',
    '/places/ekle': '/isletme-kayit',
    '/yerler': '/mekanlar',
    '/messages': '/mesajlar',
    '/notifications': '/bildirimler',
    '/profile': '/profil',
    '/isletme/': '/isletme',
    '/işletme': '/isletme',
  };

  const normalizedPath = pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
  const prefixRedirects: Array<[string, string]> = [
    ['/places/', '/isletme/'],
    ['/yerler/', '/isletme/'],
    ['/mekan/', '/isletme/'],
    ['/kategori/', '/mekanlar/'],
  ];
  const mappedPath =
    aliasRedirects[normalizedPath] ||
    prefixRedirects.reduce<string | undefined>((mapped, [from, to]) => {
      if (mapped || !normalizedPath.startsWith(from)) return mapped;
      return `${to}${normalizedPath.slice(from.length)}`;
    }, undefined);

  const incomingHost = request.headers.get('x-forwarded-host') || request.headers.get('host') || url.hostname;
  const hostWithoutPort = (incomingHost || '').split(':')[0].toLowerCase();
  const forwardedProto = (request.headers.get('x-forwarded-proto') || url.protocol.replace(':', '')).split(',')[0].trim().toLowerCase();
  const isProd = (process.env.NODE_ENV || '').toLowerCase() === 'production';
  const shouldHttpsRedirect =
    isProd &&
    hostWithoutPort === canonicalHost &&
    forwardedProto === 'http';
  const shouldCanonicalHostRedirect =
    hostWithoutPort === `www.${canonicalHost}` || hostWithoutPort === 'www.sanliurfa.com';

  if (mappedPath || shouldCanonicalHostRedirect || shouldHttpsRedirect) {
    const target = new URL(url.toString());
    if (mappedPath) target.pathname = mappedPath;
    if (shouldCanonicalHostRedirect) target.host = canonicalHost;
    if (shouldHttpsRedirect) target.protocol = 'https:';
    return context.redirect(target.toString(), 301);
  }

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

    corsHeaders['X-Request-ID'] = requestId;
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // Rate limiting for API (using Redis)
  const clientIP = getClientIP(request);

  if (pathname.startsWith('/api/')) {
    const isAllowed = await checkRateLimit(clientIP, RATE_LIMIT, RATE_LIMIT_WINDOW);
    if (!isAllowed) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded', retryAfter: RATE_LIMIT_WINDOW }), {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(RATE_LIMIT_WINDOW),
          'X-Request-ID': requestId
        }
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

          // Sliding window: her aktif istekte session TTL'yi uzat
          const sessionTtl = parseInt(process.env.SESSION_TIMEOUT || '86400', 10);
          getRedisClient().then(redis => redis.expire(prefixKey(`session:${token}`), sessionTtl)).catch(() => null);

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
  response.headers.set('X-Request-ID', requestId);

  // Add security headers
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  // Content Security Policy
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: blob: https:",
    "font-src 'self' https://fonts.gstatic.com",
    "connect-src 'self' https://www.google-analytics.com https://analytics.google.com https://www.googletagmanager.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests"
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
        isAdmin?: boolean;
        subscriptionTier?: string;
      } | null;
      isAdmin: boolean;
      isAuthenticated: boolean;
      requestId?: string;
      rateLimit?: Record<string, any>;
      tenant?: Record<string, any>;
    }
  }
}
