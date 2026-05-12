// Astro Middleware - PostgreSQL JWT Authentication
import { defineMiddleware } from 'astro:middleware';
import { randomBytes } from 'node:crypto';
import { verifyToken } from './lib/auth';
import { query, queryOne } from './lib/postgres';
import { checkRateLimit } from './lib/cache';
import { getRedisClient, prefixKey } from './lib/cache/cache';
import { logger } from './lib/logging';
function getCanonicalDomain(): string {
  const raw = process.env.SITE_URL || process.env.PUBLIC_SITE_URL || 'https://sanliurfa.com';
  try {
    return new URL(raw).hostname;
  } catch {
    return raw.replace(/^https?:\/\//, '').replace(/\/$/, '').split(':')[0] || 'sanliurfa.com';
  }
}
function getCanonicalOrigin(): URL {
  const raw = process.env.SITE_URL || process.env.PUBLIC_SITE_URL || 'https://sanliurfa.com';
  const hostname = getCanonicalDomain();
  try {
    const parsed = new URL(raw);
    return new URL(`${parsed.protocol}//${parsed.hostname || hostname}`);
  } catch {
    return new URL(`https://${hostname}`);
  }
}
function getAllowedOriginsFromEnv(raw?: string): string[] {
  if (!raw) return [];
  return raw.split(',').map(o => o.trim()).filter(Boolean);
}

// Public paths that don't require authentication
const PUBLIC_PATHS = [
  '/', '/giris', '/kayit', '/places', '/tarihi-yerler', '/blog',
  '/gastronomi', '/arama', '/hakkinda', '/iletisim', '/etkinlikler',
  '/gizlilik-politikasi', '/kullanim-kosullari', '/kvkk',
  '/fiyatlandirma', '/sss', '/cerez-politikasi', '/404', '/500', '/loading',
  '/mekanlar', '/ilceler', '/gezilecek-yerler', '/saglik', '/mahalleler', '/yeme-icme',
  '/topluluk', '/eslesme', '/yemek-tarifleri',
  '/egitim', '/ulasim', '/alisveris', '/hizmetler', '/emlak', '/konaklama', '/etkinlikler', '/isletme',
  '/otomotiv', '/acil-durum', '/hukuk-ve-finans', '/ev-ve-yasam', '/spor-ve-fitness',
  '/aile-ve-cocuk', '/tarim-ve-hayvancilik', '/medya-ve-iletisim',
  '/dini-ve-kulturel-yerler', '/is-dunyasi-ve-sanayi',
  '/harita', '/kesfet',
  '/en-iyi-kebapcilar', '/en-iyi-cigerciler', '/sanliurfa-kahvalti-mekanlari',
  '/en-iyi-oteller', '/en-iyi-gezilecek-yerler', '/en-iyi-kahvalti-mekanlari', '/ucretsiz-gezilecek-yerler',
  '/sanliurfa-sira-gecesi-mekanlari', '/sanliurfa-gece-acik-mekanlar',
  '/sanliurfada-ne-yenir', '/bugun-sanliurfada-ne-yapilir',
  '/halfeti-tekne-turu', '/sanliurfa-fotograf-sporlari',
  '/halfeti-gezi-rehberi', '/gobeklitepe-gezi-rehberi', '/harran-gezi-rehberi',
  '/balikligol-gezi-rehberi', '/sanliurfa-gezi-rehberi', '/birecik-gezi-rehberi',
  '/akcakale-gezi-rehberi', '/bozova-gezi-rehberi', '/ceylanpinar-gezi-rehberi',
  '/hilvan-gezi-rehberi', '/siverek-gezi-rehberi', '/suruc-gezi-rehberi',
  '/viransehir-gezi-rehberi',
  '/sifre-sifirla', '/sifremi-unuttum', '/verify-email', '/cikis', '/icerik-rehberi',
  '/api/auth/login', '/api/auth/register', '/api/auth/forgot-password',
  '/api/auth/reset-password', '/api/auth/callback',
  '/api/places', '/api/health',
  '/api/contact', '/api/reviews', '/api/hashtags', '/api/leaderboards',
  '/api/saglik/nobetci', '/api/places/apply',
  '/api/security/csp-report',
  '/api/social/stats',
  '/isletme-kayit', '/etkinlik-ekle', '/ara',
  '/kullanicilar', '/trend', '/siralamalar', '/liderlik-tablosu', '/oneriler',
  '/sitemap.xml', '/sitemap-pages.xml', '/sitemap-categories.xml', '/sitemap-ilceler.xml',
  '/sitemap-places.xml', '/sitemap-historical.xml', '/sitemap-blog.xml',
  '/sitemap-events.xml', '/sitemap-recipes.xml', '/sitemap-guides.xml',
  '/rss.xml', '/robots.txt', '/llms.txt',
 '/uploads', '/images', '/icons', '/_astro', '/_server-islands', '/favicon.svg', '/favicon.ico',
 '/manifest.json', '/sw.js', '/og-image.png', '/apple-touch-icon.png',
];

// Admin only paths
const ADMIN_PATHS = ['/admin'];

// CORS configuration
const CORS_ORIGINS = getAllowedOriginsFromEnv(process.env.CORS_ORIGINS);

// Tiered rate limits — per IP, per 15-minute window
const RATE_LIMITS = {
  auth: { limit: 10, window: 15 * 60 },     // login/register — brute force protection
  upload: { limit: 20, window: 15 * 60 },   // file uploads — bandwidth protection
  admin: { limit: 300, window: 15 * 60 },   // admin bulk operations — higher threshold
  social: { limit: 50, window: 15 * 60 },   // match/review/comment — anti-spam
  default: { limit: 100, window: 15 * 60 }, // all other API routes
} as const;

// Per-user write rate limits — prevents single user from hammering writes across IPs
const USER_WRITE_LIMITS = {
  auth: { limit: 5, window: 15 * 60 },
  upload: { limit: 10, window: 15 * 60 },
  admin: { limit: 150, window: 15 * 60 },
  social: { limit: 25, window: 15 * 60 },
  default: { limit: 40, window: 15 * 60 },
} as const;

function getRateLimitTier(pathname: string): keyof typeof RATE_LIMITS {
  if (
    pathname === '/api/auth/login' ||
    pathname === '/api/auth/register' ||
    pathname === '/api/auth/forgot-password' ||
    pathname === '/api/auth/reset-password' ||
    pathname === '/api/auth/login/verify-2fa' ||
    pathname.startsWith('/api/auth/2fa/') ||
    pathname === '/api/users/verify-email' ||
    pathname === '/api/onboarding/verify-email' ||
    pathname === '/api/users/password' ||
    pathname === '/api/users/privacy/delete-account' ||
    pathname === '/api/billing/checkout' ||
    pathname.startsWith('/api/users/2fa/') ||
    pathname.startsWith('/api/users/deletion/') ||
    pathname === '/api/contact'
  ) return 'auth';
  if (pathname.startsWith('/api/upload') || pathname.startsWith('/api/community/photos') || pathname.startsWith('/api/social/tinder-photos')) return 'upload';
  if (pathname.startsWith('/api/admin/')) return 'admin';
  // Anti-spam: match/review/comment endpoint'leri — bot+kötü niyetli kullanıcıya karşı sıkı limit
  if (
    pathname === '/api/social/matches' ||
    pathname === '/api/social/match-candidates' ||
    pathname.startsWith('/api/social/swipe') ||
    pathname === '/api/reviews/add' ||
    pathname.startsWith('/api/comments') ||
    pathname.startsWith('/api/blog/comments') ||
    pathname.startsWith('/api/places/') && pathname.endsWith('/follow') ||
    pathname.startsWith('/api/followers') ||
    pathname.startsWith('/api/following')
  ) return 'social';
  return 'default';
}


const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'X-Permitted-Cross-Domain-Policies': 'none',
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
  const canonicalOrigin = getCanonicalOrigin();
  const requestId =
    request.headers.get('x-request-id') ||
    `req-${Date.now()}-${randomBytes(6).toString('hex')}`;

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
    '/vendor/dashboard': '/isletme/panel',
    '/vendor/analytics': '/isletme/analytics',
    '/messages': '/mesajlar',
    '/notifications': '/bildirimler',
    '/profile': '/profil',
    '/isletme/': '/isletme',
    '/işletme': '/isletme',
    '/hakkimizda': '/hakkinda',
    '/kullanıcılar': '/kullanicilar',
  };

  const normalizedPath = pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
  const prefixRedirects: Array<[string, string]> = [
    ['/places/', '/isletme/'],
    ['/yerler/', '/isletme/'],
    ['/mekan/', '/isletme/'],
    ['/kategori/', '/mekanlar/'],
    ['/işletme/', '/isletme/'],
    ['/kullanıcı/', '/kullanici/'],
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
  const shouldCanonicalizeAliasOrigin =
    Boolean(mappedPath) &&
    (hostWithoutPort === canonicalHost || hostWithoutPort === `www.${canonicalHost}` || hostWithoutPort === 'www.sanliurfa.com');

  if (mappedPath || shouldCanonicalHostRedirect || shouldHttpsRedirect) {
    const target = new URL(url.toString());
    if (mappedPath) target.pathname = mappedPath;
    if (isProd || shouldCanonicalizeAliasOrigin || shouldCanonicalHostRedirect || shouldHttpsRedirect) {
      target.protocol = canonicalOrigin.protocol;
      target.host = canonicalOrigin.host;
      target.port = '';
    }
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
      corsHeaders['Vary'] = 'Origin';
    }

    corsHeaders['X-Request-ID'] = requestId;
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // Request body size cap (DoS prevention) — application-layer defense.
  // Reverse proxy (Apache on CWP) genellikle 1-10MB cap'i var ama defense-in-depth.
  // /api/upload* için 15MB (image upload), diğer /api/* için 1MB, sayfa render'ları sınırsız.
  if (pathname.startsWith('/api/') && (request.method === 'POST' || request.method === 'PUT' || request.method === 'PATCH')) {
    const contentLengthHeader = request.headers.get('content-length');
    if (contentLengthHeader) {
      const contentLength = parseInt(contentLengthHeader, 10);
      const isUpload = pathname.startsWith('/api/upload') || pathname.startsWith('/api/photos/upload') || pathname.startsWith('/api/files/upload') || pathname.startsWith('/api/community/photos') || pathname.startsWith('/api/social/tinder-photos') || pathname.startsWith('/api/admin/blog/upload');
      const maxBytes = isUpload ? 15 * 1024 * 1024 : 1 * 1024 * 1024; // 15MB upload, 1MB other
      if (Number.isFinite(contentLength) && contentLength > maxBytes) {
        return new Response(
          JSON.stringify({ error: 'Payload too large', maxBytes, receivedBytes: contentLength }),
          {
            status: 413,
            headers: {
              'Content-Type': 'application/json',
              'X-Request-ID': requestId,
            },
          },
        );
      }
    }
  }

  // Rate limiting for API (using Redis)
  const clientIP = getClientIP(request);
  const rateLimitBypassed = process.env.NODE_ENV !== 'production' && process.env.E2E_RATE_LIMIT_BYPASS === '1';

  if (pathname.startsWith('/api/') && !rateLimitBypassed) {
    const tier = getRateLimitTier(pathname);
    const { limit, window: win } = RATE_LIMITS[tier];
    const rateLimitKey = `${tier}:${clientIP}`;
    const isAllowed = await checkRateLimit(rateLimitKey, limit, win);
    if (!isAllowed) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded', retryAfter: win }), {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(win),
          'X-RateLimit-Limit': String(limit),
          'X-RateLimit-Policy': tier,
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
          context.locals.isAdmin = user.role === 'admin' || user.role === 'moderator'; // page-level access (admin panel)
          context.locals.isModerator = user.role === 'moderator'; // moderator-only granular check
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
      logger.error('Auth middleware error', err instanceof Error ? err : new Error(String(err)));
      cookies.delete('auth-token', { path: '/' });
      
      if (!isPublicPath) {
        return context.redirect('/giris?error=session_error');
      }
    }
  }

  // Per-user rate limiting for write operations — prevents cross-IP abuse by authenticated users
  if (
    !rateLimitBypassed &&
    pathname.startsWith('/api/') &&
    context.locals.user?.id &&
    ['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)
  ) {
    const userTier = getRateLimitTier(pathname);
    const { limit: userLimit, window: userWin } = USER_WRITE_LIMITS[userTier];
    const userKey = `user:${context.locals.user.id}:write:${userTier}`;
    const userAllowed = await checkRateLimit(userKey, userLimit, userWin);
    if (!userAllowed) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded', retryAfter: userWin }), {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(userWin),
          'X-RateLimit-Limit': String(userLimit),
          'X-RateLimit-Policy': `user-write:${userTier}`,
          'X-Request-ID': requestId,
        },
      });
    }
  }

  // If no token and path requires auth, redirect to login
  if (!token && !isPublicPath && !pathname.startsWith('/api/')) {
    return context.redirect('/giris?redirect=' + encodeURIComponent(pathname));
  }

  const renderStart = Date.now();
  const response = await next();
  const renderMs = Date.now() - renderStart;
  response.headers.set('X-Request-ID', requestId);
  // Server-Timing: tarayıcı DevTools Network sekmesi "Timing" → "Server" altında görünür
  response.headers.set('Server-Timing', `ssr;dur=${renderMs}`);

  // Slow page detection — SSR sayfaları için 800ms üstü warn log'la
  // (admin/api hariç; admin operasyonları normal olarak uzun sürebilir).
  if (
    renderMs > 800 &&
    !pathname.startsWith('/api/') &&
    !pathname.startsWith('/admin/') &&
    !pathname.startsWith('/_astro') &&
    !pathname.startsWith('/_server-islands') &&
    !pathname.startsWith('/uploads') &&
    response.status === 200
  ) {
    logger.warn('Slow SSR render', { path: pathname, ms: renderMs, status: response.status });
    // Async, fail-safe DB write — request latency'yi etkilemez.
    // /admin/performance dashboard'unda path bazlı aggregate (count/avg/p95/max).
    query(
      'INSERT INTO ssr_perf_metrics (path, duration_ms, status) VALUES ($1, $2, $3)',
      [pathname, renderMs, response.status],
    ).catch(() => null);
  }

  // Add security headers
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  // Content Security Policy
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://static.cloudflareinsights.com",
    "script-src-elem 'self' 'unsafe-inline' https://www.googletagmanager.com https://static.cloudflareinsights.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: blob: https:",
    "font-src 'self' https://fonts.gstatic.com",
    "connect-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com https://www.google-analytics.com https://analytics.google.com https://www.googletagmanager.com https://cloudflareinsights.com https://static.cloudflareinsights.com",
    "media-src 'self' blob:",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests",
    "report-uri /api/security/csp-report"
  ].join('; ');

  response.headers.set('Content-Security-Policy', csp);

  // X-Robots-Tag: admin ve vendor sayfaları bot tarafından indexlenmemeli (meta noIndex'e ek koruma)
  if (pathname.startsWith('/admin') || pathname.startsWith('/vendor/')) {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  }

  // Cache-Control: API yanıtları tarayıcıda cache'lenmemeli (private data)
  if (pathname.startsWith('/api/') && !response.headers.has('Cache-Control')) {
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  }

  // Add CORS headers for API routes if origin is allowed
  if (pathname.startsWith('/api/')) {
    const origin = request.headers.get('Origin');
    if (origin && CORS_ORIGINS.includes(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin);
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      response.headers.set('Access-Control-Allow-Credentials', 'true');
      response.headers.set('Vary', 'Origin');
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
        role: 'user' | 'admin' | 'moderator' | 'vendor';
        avatar: string | null;
        points: number;
        isAdmin?: boolean;
        subscriptionTier?: string;
      } | null;
      isAdmin: boolean;
      isModerator: boolean;
      isAuthenticated: boolean;
      requestId?: string;
      rateLimit?: Record<string, any>;
      tenant?: Record<string, any>;
    }
  }
}
