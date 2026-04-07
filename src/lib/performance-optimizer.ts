/**
 * Performance Optimizer
 * Implements aggressive caching and query optimization strategies
 */

import { getCache, setCache, deleteCache, deleteCachePattern } from './cache';
import { queryMany, queryOne } from './postgres';
import { logger } from './logging';

export interface CacheStrategy {
  key: string;
  ttl: number;
  pattern?: string;
  invalidateOn?: string[];
}

// Aggressive cache strategies for high-traffic resources
export const CACHE_STRATEGIES: Record<string, CacheStrategy> = {
  // Places cache - 10 minutes
  places_list: {
    key: 'sanliurfa:places:list',
    ttl: 600,
    invalidateOn: ['create_place', 'update_place', 'delete_place']
  },
  places_detail: {
    key: 'sanliurfa:places:{id}',
    ttl: 600,
    invalidateOn: ['update_place']
  },
  places_by_category: {
    key: 'sanliurfa:places:category:{category}',
    ttl: 600,
    invalidateOn: ['create_place', 'update_place', 'delete_place']
  },

  // Reviews cache - 5 minutes
  reviews_list: {
    key: 'sanliurfa:reviews:place:{placeId}',
    ttl: 300,
    invalidateOn: ['create_review', 'update_review', 'delete_review']
  },
  reviews_trending: {
    key: 'sanliurfa:reviews:trending',
    ttl: 300,
    invalidateOn: ['create_review']
  },

  // User data cache - 5 minutes per user
  user_favorites: {
    key: 'sanliurfa:favorites:{userId}',
    ttl: 300,
    invalidateOn: ['add_favorite', 'remove_favorite']
  },
  user_reviews: {
    key: 'sanliurfa:reviews:user:{userId}',
    ttl: 300,
    invalidateOn: ['create_review', 'update_review']
  },

  // Search cache - 1 hour
  search_results: {
    key: 'sanliurfa:search:{query}:{page}',
    ttl: 3600,
    invalidateOn: ['create_place', 'update_place', 'delete_place']
  },

  // Aggregations - 1 hour
  stats_daily: {
    key: 'sanliurfa:stats:daily',
    ttl: 3600,
    invalidateOn: []
  },
  trending_places: {
    key: 'sanliurfa:trending:places',
    ttl: 3600,
    invalidateOn: []
  },

  // Static content - 24 hours
  categories: {
    key: 'sanliurfa:categories',
    ttl: 86400,
    invalidateOn: []
  },
  districts: {
    key: 'sanliurfa:districts',
    ttl: 86400,
    invalidateOn: []
  }
};

/**
 * Get cached or compute value (memoization)
 */
export async function getOrCache<T>(
  cacheKey: string,
  ttl: number,
  computeFn: () => Promise<T>
): Promise<T | null> {
  try {
    // Try to get from cache
    const cached = await getCache(cacheKey);

    if (cached) {
      logger.debug('Cache HIT', { key: cacheKey });
      return JSON.parse(cached);
    }

    // Compute value
    logger.debug('Cache MISS', { key: cacheKey });
    const value = await computeFn();

    if (value) {
      // Store in cache
      await setCache(cacheKey, JSON.stringify(value), ttl);
    }

    return value;
  } catch (error) {
    logger.error('Cache operation failed', error instanceof Error ? error : new Error(String(error)), { cacheKey });
    return null;
  }
}

/**
 * Invalidate cache for related resources
 */
export async function invalidateRelatedCaches(eventType: string): Promise<void> {
  try {
    // Find all cache strategies that depend on this event
    const affectedCaches = Object.values(CACHE_STRATEGIES).filter(
      strategy => strategy.invalidateOn && strategy.invalidateOn.includes(eventType)
    );

    for (const strategy of affectedCaches) {
      if (strategy.pattern) {
        // Pattern-based invalidation
        await deleteCachePattern(strategy.pattern);
      } else {
        // Exact key invalidation
        await deleteCache(strategy.key);
      }
    }

    logger.info('Cache invalidated', { eventType, affectedCount: affectedCaches.length });
  } catch (error) {
    logger.error('Cache invalidation failed', error instanceof Error ? error : new Error(String(error)), { eventType });
  }
}

/**
 * Query optimizer - adds indices automatically
 */
export async function suggestIndexes(): Promise<string[]> {
  const suggestions: string[] = [];

  // Common queries that would benefit from indexes
  const commonIndexes = [
    { table: 'places', column: 'category_id', reason: 'For filtering by category' },
    { table: 'places', column: 'district_id', reason: 'For filtering by district' },
    { table: 'reviews', column: 'place_id', reason: 'For getting place reviews' },
    { table: 'reviews', column: 'user_id', reason: 'For getting user reviews' },
    { table: 'reviews', column: 'created_at', reason: 'For sorting by date' },
    { table: 'favorites', column: 'user_id', reason: 'For getting user favorites' },
    { table: 'places', columns: ['latitude', 'longitude'], reason: 'For geo-proximity queries' },
    { table: 'reviews', columns: ['place_id', 'created_at'], reason: 'For getting recent reviews by place' }
  ];

  return commonIndexes.map(idx => `CREATE INDEX idx_${idx.table}_${idx.column || idx.columns?.join('_')} ON ${idx.table}(${idx.column || idx.columns?.join(', ')})`);
}

/**
 * Batch query optimization - combine N queries into one
 */
export async function getPlacesWithReviewsCombined(placeIds: string[]): Promise<any[]> {
  const cacheKey = `sanliurfa:places:combined:${placeIds.join(',')}`;

  return getOrCache(cacheKey, 600, async () => {
    const query = `
      SELECT
        p.id, p.name, p.description, p.category_id, p.rating,
        (SELECT COUNT(*) FROM reviews WHERE place_id = p.id) as review_count,
        (SELECT AVG(rating) FROM reviews WHERE place_id = p.id) as avg_rating
      FROM places p
      WHERE p.id = ANY($1)
      ORDER BY p.name
    `;

    return queryMany(query, [placeIds]);
  });
}

/**
 * Lazy load optimization
 */
export async function getPaginatedPlaces(page: number = 1, limit: number = 20): Promise<any> {
  const offset = (page - 1) * limit;
  const cacheKey = `sanliurfa:places:paginated:${page}:${limit}`;

  return getOrCache(cacheKey, 600, async () => {
    const items = await queryMany(
      'SELECT * FROM places ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );

    const totalResult = await queryOne('SELECT COUNT(*) as total FROM places');

    return {
      items,
      page,
      limit,
      total: totalResult?.total || 0,
      totalPages: Math.ceil((totalResult?.total || 0) / limit)
    };
  });
}

/**
 * N+1 query prevention - eager loading
 */
export async function getPlacesWithDetails(filter: string = ''): Promise<any[]> {
  const cacheKey = `sanliurfa:places:details:${filter}`;

  return getOrCache(cacheKey, 600, async () => {
    const query = `
      SELECT
        p.*,
        (
          SELECT json_agg(
            json_build_object(
              'id', r.id,
              'rating', r.rating,
              'text', r.text,
              'author', u.full_name
            )
          )
          FROM reviews r
          JOIN users u ON r.user_id = u.id
          WHERE r.place_id = p.id
          ORDER BY r.created_at DESC
          LIMIT 5
        ) as recent_reviews,
        COUNT(DISTINCT f.id) as favorite_count
      FROM places p
      LEFT JOIN favorites f ON p.id = f.place_id
      ${filter ? `WHERE p.category_id = $1` : ''}
      GROUP BY p.id
      ORDER BY p.rating DESC
      LIMIT 50
    `;

    const params = filter ? [filter] : [];
    return queryMany(query, params);
  });
}

/**
 * Query result deduplication
 */
export function deduplicateResults<T extends { id: string | number }>(results: T[]): T[] {
  const seen = new Set<string | number>();
  return results.filter(item => {
    if (seen.has(item.id)) {
      return false;
    }
    seen.add(item.id);
    return true;
  });
}

/**
 * Compression - minify response data
 */
export function compressData(data: any): any {
  if (typeof data !== 'object' || data === null) {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(item => compressData(item));
  }

  // Remove null/undefined values
  const compressed: any = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== null && value !== undefined) {
      compressed[key] = compressData(value);
    }
  }

  return compressed;
}

/**
 * Sparse field selection - only fetch needed columns
 */
export function buildSelectQuery(table: string, fields?: string[]): string {
  const defaultFields = ['id', 'name', 'created_at'];
  const selectedFields = fields && fields.length > 0 ? fields : defaultFields;

  // Validate fields to prevent injection
  const sanitizedFields = selectedFields.filter(f => /^[a-z_]+$/i.test(f));

  return `SELECT ${sanitizedFields.join(', ')} FROM ${table}`;
}

/**
 * Monitor query performance
 */
export interface QueryPerformanceMetric {
  query: string;
  duration: number;
  rows: number;
  cached: boolean;
}

const queryMetrics: QueryPerformanceMetric[] = [];

export function recordQueryMetric(metric: QueryPerformanceMetric): void {
  queryMetrics.push(metric);

  // Keep only recent 1000 metrics
  if (queryMetrics.length > 1000) {
    queryMetrics.shift();
  }

  // Alert on slow queries
  if (metric.duration > 1000) {
    logger.warn('Slow query detected', { duration: metric.duration, rows: metric.rows });
  }
}

export function getQueryMetrics(): QueryPerformanceMetric[] {
  return queryMetrics;
}

export function getSlowQueries(threshold: number = 1000): QueryPerformanceMetric[] {
  return queryMetrics.filter(m => m.duration > threshold);
}
