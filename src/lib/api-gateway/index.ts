/**
 * API Gateway Module
 * Unified API management with rate limiting, auth, and routing
 */

import { rateLimit, RateLimitConfig } from '../rate-limit/tiers';

export interface GatewayConfig {
  basePath: string;
  rateLimitConfig: RateLimitConfig;
  corsOrigins: string[];
  requireAuth: boolean;
}

export interface GatewayRequest {
  path: string;
  method: string;
  headers: Record<string, string>;
  query: Record<string, string>;
  body?: any;
  user?: any;
  ip: string;
}

export interface GatewayResponse {
  status: number;
  headers: Record<string, string>;
  body: any;
}

export interface Route {
  path: string;
  methods: string[];
  handler: (req: GatewayRequest) => Promise<GatewayResponse>;
  requireAuth?: boolean;
  rateLimit?: RateLimitConfig;
  cache?: { ttl: number };
}

// Route registry
const routes = new Map<string, Route>();
const middlewares: Array<(req: GatewayRequest) => Promise<GatewayRequest | null>> = [];

/**
 * Register a route
 */
export function registerRoute(route: Route): void {
  const key = `${route.methods.join(',')}:${route.path}`;
  routes.set(key, route);
}

/**
 * Register middleware
 */
export function use(middleware: (req: GatewayRequest) => Promise<GatewayRequest | null>): void {
  middlewares.push(middleware);
}

/**
 * Handle incoming request
 */
export async function handleRequest(
  incomingReq: Request,
  config: GatewayConfig
): Promise<Response> {
  const startTime = Date.now();

  try {
    // Parse request
    const req = await parseRequest(incomingReq);

    // Apply middlewares
    for (const middleware of middlewares) {
      const result = await middleware(req);
      if (result === null) {
        return createErrorResponse(403, 'Forbidden');
      }
    }

    // CORS check
    const corsError = checkCors(req, config.corsOrigins);
    if (corsError) {
      return corsError;
    }

    // Find route
    const route = findRoute(req);
    if (!route) {
      return createErrorResponse(404, 'Not Found');
    }

    // Check auth
    if (route.requireAuth && !req.user) {
      return createErrorResponse(401, 'Unauthorized');
    }

    // Apply rate limiting
    const rateLimitResult = await checkRateLimit(req, route.rateLimit || config.rateLimitConfig);
    if (!rateLimitResult.allowed) {
      return createErrorResponse(429, 'Too Many Requests', {
        'X-RateLimit-Limit': String(rateLimitResult.limit),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': String(rateLimitResult.resetTime)
      });
    }

    // Execute handler
    const response = await route.handler(req);

    // Add rate limit headers
    response.headers['X-RateLimit-Limit'] = String(rateLimitResult.limit);
    response.headers['X-RateLimit-Remaining'] = String(rateLimitResult.remaining);

    // Add timing header
    response.headers['X-Response-Time'] = `${Date.now() - startTime}ms`;

    return createResponse(response);

  } catch (error: any) {
    logger.error('Gateway error:', error);
    return createErrorResponse(500, 'Internal Server Error');
  }
}

/**
 * Parse request
 */
async function parseRequest(req: Request): Promise<GatewayRequest> {
  const url = new URL(req.url);
  
  return {
    path: url.pathname,
    method: req.method,
    headers: Object.fromEntries(req.headers.entries()),
    query: Object.fromEntries(url.searchParams.entries()),
    body: req.method !== 'GET' && req.method !== 'HEAD' ? await req.json().catch(() => undefined) : undefined,
    ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
  };
}

/**
 * Find matching route
 */
function findRoute(req: GatewayRequest): Route | null {
  // Exact match first
  const exactKey = `${req.method}:${req.path}`;
  if (routes.has(exactKey)) {
    return routes.get(exactKey)!;
  }

  // Pattern matching
  for (const [key, route] of routes.entries()) {
    const [methods, pathPattern] = key.split(':');
    
    if (!methods.split(',').includes(req.method)) continue;
    
    if (matchPath(req.path, pathPattern)) {
      return route;
    }
  }

  return null;
}

/**
 * Match path with pattern
 */
function matchPath(path: string, pattern: string): boolean {
  const pathParts = path.split('/').filter(Boolean);
  const patternParts = pattern.split('/').filter(Boolean);

  if (pathParts.length !== patternParts.length) return false;

  for (let i = 0; i < patternParts.length; i++) {
    if (patternParts[i].startsWith('[') && patternParts[i].endsWith(']')) {
      // Dynamic segment - matches anything
      continue;
    }
    if (patternParts[i] !== pathParts[i]) {
      return false;
    }
  }

  return true;
}

/**
 * Check CORS
 */
function checkCors(req: GatewayRequest, allowedOrigins: string[]): Response | null {
  const origin = req.headers['origin'];
  
  if (!origin) return null;
  
  if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
    return null;
  }

  return createErrorResponse(403, 'CORS not allowed');
}

/**
 * Check rate limit
 */
async function checkRateLimit(
  req: GatewayRequest,
  config: RateLimitConfig
): Promise<{ allowed: boolean; limit: number; remaining: number; resetTime?: number }> {
  const identifier = req.user?.id || req.ip;
  return rateLimit(identifier, config);
}

/**
 * Create success response
 */
function createResponse(gatewayRes: GatewayResponse): Response {
  return new Response(JSON.stringify(gatewayRes.body), {
    status: gatewayRes.status,
    headers: {
      'Content-Type': 'application/json',
      ...gatewayRes.headers
    }
  });
}

/**
 * Create error response
 */
function createErrorResponse(
  status: number,
  message: string,
  extraHeaders: Record<string, string> = {}
): Response {
  return new Response(
    JSON.stringify({ error: message, status }),
    {
      status,
      headers: {
        'Content-Type': 'application/json',
        ...extraHeaders
      }
    }
  );
}

/**
 * API versioning middleware
 */
export function apiVersioning(versions: string[], defaultVersion: string) {
  return async (req: GatewayRequest): Promise<GatewayRequest> => {
    const version = req.headers['x-api-version'] || defaultVersion;
    
    if (!versions.includes(version)) {
      throw new Error(`Invalid API version. Supported: ${versions.join(', ')}`);
    }

    req.headers['x-api-version'] = version;
    return req;
  };
}

/**
 * Request validation middleware
 */
export function validateRequest(schema: any) {
  return async (req: GatewayRequest): Promise<GatewayRequest> => {
    // Simple validation - in production use Zod or Joi
    if (req.body && schema.body) {
      for (const [field, type] of Object.entries(schema.body)) {
        if (typeof req.body[field] !== type) {
          throw new Error(`Invalid field: ${field}`);
        }
      }
    }
    return req;
  };
}

/**
 * Logging middleware
 */
export function requestLogger(logFn: (data: any) => void) {
  return async (req: GatewayRequest): Promise<GatewayRequest> => {
    const startTime = Date.now();
    
    // Log after response
    setTimeout(() => {
      logFn({
        method: req.method,
        path: req.path,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        duration: Date.now() - startTime
      });
    }, 0);

    return req;
  };
}

/**
 * Cache middleware
 */
const cache = new Map<string, { data: any; expires: number }>();

export function cacheMiddleware(ttlSeconds: number = 60) {
  return async (req: GatewayRequest): Promise<GatewayRequest | null> => {
    if (req.method !== 'GET') return req;

    const cacheKey = `${req.path}?${new URLSearchParams(req.query).toString()}`;
    const cached = cache.get(cacheKey);

    if (cached && cached.expires > Date.now()) {
      // Return cached response
      throw new CacheHitException(cached.data);
    }

    return req;
  };
}

class CacheHitException extends Error {
  constructor(public data: any) {
    super('Cache hit');
  }
}

/**
 * Set cache entry
 */
export function setCache(key: string, data: any, ttlSeconds: number): void {
  cache.set(key, {
    data,
    expires: Date.now() + ttlSeconds * 1000
  });
}

/**
 * Get cache entry
 */
export function getCache(key: string): any | null {
  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) {
    return cached.data;
  }
  return null;
}

/**
 * Clear cache
 */
export function clearCache(pattern?: string): void {
  if (pattern) {
    for (const key of cache.keys()) {
      if (key.includes(pattern)) {
        cache.delete(key);
      }
    }
  } else {
    cache.clear();
  }
}

/**
 * API health check
 */
export async function healthCheck(): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: Record<string, boolean>;
}> {
  const checks: Record<string, boolean> = {
    database: await checkDatabase(),
    cache: cache.size >= 0,
    routes: routes.size > 0
  };

  const allHealthy = Object.values(checks).every(v => v);
  
  return {
    status: allHealthy ? 'healthy' : 'degraded',
    checks
  };
}

async function checkDatabase(): Promise<boolean> {
  try {
    await query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}

import { query } from '../postgres';
import { logger } from '../logging';
