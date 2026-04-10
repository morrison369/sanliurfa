/**
 * Performance Optimizer
 * Implements aggressive caching and query optimization strategies
 */

import { getCache, setCache, deleteCache, deleteCachePattern } from './cache';
import { queryRows, queryOne } from './postgres';
import { logger } from './logging';
export {
  CACHE_STRATEGIES,
  getQueryMetrics,
  getSlowQueries,
  recordQueryMetric,
  suggestIndexes
} from './performance-ops-core';
import { CACHE_STRATEGIES } from './performance-ops-core';

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
 * Batch query optimization - combine N queries into one
 */
export async function getPlacesWithReviewsCombined(placeIds: string[]): Promise<any[]> {
  const cacheKey = `sanliurfa:places:combined:${placeIds.join(',')}`;

  const result = await getOrCache(cacheKey, 600, async () => {
    const query = `
      SELECT
        p.id, p.name, p.description, p.category_id, p.rating,
        (SELECT COUNT(*) FROM reviews WHERE place_id = p.id) as review_count,
        (SELECT AVG(rating) FROM reviews WHERE place_id = p.id) as avg_rating
      FROM places p
      WHERE p.id = ANY($1)
      ORDER BY p.name
    `;

    return queryRows(query, [placeIds]);
  });

  return result ?? [];
}

/**
 * Lazy load optimization
 */
export async function getPaginatedPlaces(page: number = 1, limit: number = 20): Promise<any> {
  const offset = (page - 1) * limit;
  const cacheKey = `sanliurfa:places:paginated:${page}:${limit}`;

  return getOrCache(cacheKey, 600, async () => {
    const items = await queryRows(
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

  const result = await getOrCache(cacheKey, 600, async () => {
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
    return queryRows(query, params);
  });

  return result ?? [];
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
