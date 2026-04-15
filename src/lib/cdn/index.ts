/**
 * CDN & Edge Caching
 * Phase 2.3: Content Delivery Optimization
 */

import { db } from '../db';
import { sql } from 'drizzle-orm';
import { logger } from '../logging';

// CDN Configuration
const CDN_CONFIG = {
  enabled: process.env.CDN_ENABLED === 'true',
  baseUrl: process.env.CDN_URL || 'https://cdn.sanliurfa.com',
  edgeLocations: ['istanbul', 'ankara', 'izmir', 'berlin', 'london'],
  cacheTtl: {
    static: 86400,      // 1 day
    images: 604800,     // 1 week
    api: 300,           // 5 minutes
    html: 60,           // 1 minute
  },
};

export interface CacheConfig {
  ttl: number;
  tags?: string[];
  vary?: string[];
}

/**
 * Generate CDN URL for asset
 */
export function getCDNUrl(path: string, options?: { width?: number; height?: number; format?: string }): string {
  if (!CDN_CONFIG.enabled) {
    return path;
  }

  let url = `${CDN_CONFIG.baseUrl}${path}`;

  // Add image optimization parameters
  if (options && (options.width || options.height || options.format)) {
    const params = new URLSearchParams();
    if (options.width) params.set('w', options.width.toString());
    if (options.height) params.set('h', options.height.toString());
    if (options.format) params.set('f', options.format);
    url += `?${params.toString()}`;
  }

  return url;
}

/**
 * Purge CDN cache
 */
export async function purgeCache(tags: string[]): Promise<void> {
  if (!CDN_CONFIG.enabled) return;

  logger.info(`[CDN] Purging cache for tags: ${tags.join(', ')}`);

  // Call CDN API to purge
  // await fetch(`${CDN_CONFIG.baseUrl}/api/purge`, { ... });

  // Log purge event
  await db.execute(sql`
    INSERT INTO cdn_purge_logs (id, tags, purged_at)
    VALUES (${generateId()}, ${JSON.stringify(tags)}, ${new Date()})
  `);
}

/**
 * Generate cache headers
 */
export function generateCacheHeaders(config: CacheConfig): Record<string, string> {
  const headers: Record<string, string> = {};

  // Cache-Control
  const directives = [`max-age=${config.ttl}`];
  
  if (config.ttl > 0) {
    directives.push('public');
  } else {
    directives.push('no-cache', 'no-store');
  }

  headers['Cache-Control'] = directives.join(', ');

  // Cache tags for selective purge
  if (config.tags && config.tags.length > 0) {
    headers['Cache-Tag'] = config.tags.join(',');
  }

  // Vary headers
  if (config.vary && config.vary.length > 0) {
    headers['Vary'] = config.vary.join(', ');
  }

  return headers;
}

/**
 * Edge-side rendering cache key
 */
export function generateEdgeCacheKey(
  url: string,
  context: { 
    userAgent?: string; 
    acceptLanguage?: string; 
    cookie?: string;
  }
): string {
  const parts = [url];

  // Device type
  if (context.userAgent) {
    const isMobile = /mobile|android|iphone/i.test(context.userAgent);
    parts.push(isMobile ? 'mobile' : 'desktop');
  }

  // Language preference
  if (context.acceptLanguage) {
    const lang = context.acceptLanguage.split(',')[0].split('-')[0];
    parts.push(lang);
  }

  // User segment (for personalization)
  if (context.cookie) {
    const hasAuth = context.cookie.includes('auth=');
    parts.push(hasAuth ? 'auth' : 'guest');
  }

  return parts.join('|');
}

/**
 * Warm cache for popular content
 */
export async function warmCache(): Promise<void> {
  logger.info('[CDN] Warming cache...');

  // Get popular places
  const places = await db.execute(sql`
    SELECT id FROM places 
    WHERE status = 'active' 
    ORDER BY view_count DESC 
    LIMIT 100
  `);

  // Pre-fetch and cache
  for (const place of places.rows) {
    const url = `/api/places/${place.id}`;
    // Trigger edge fetch
    logger.info(`[CDN] Warming: ${url}`);
  }
}

/**
 * Image optimization via CDN
 */
export function getOptimizedImageUrl(
  originalUrl: string,
  options: {
    width?: number;
    height?: number;
    quality?: number;
    format?: 'webp' | 'jpeg' | 'png' | 'avif';
    fit?: 'cover' | 'contain' | 'fill';
  }
): string {
  if (!CDN_CONFIG.enabled) {
    return originalUrl;
  }

  const params = new URLSearchParams();
  
  if (options.width) params.set('width', options.width.toString());
  if (options.height) params.set('height', options.height.toString());
  if (options.quality) params.set('quality', options.quality.toString());
  if (options.format) params.set('format', options.format);
  if (options.fit) params.set('fit', options.fit);

  return `${CDN_CONFIG.baseUrl}/cdn-cgi/image/${params.toString()}/${originalUrl}`;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
