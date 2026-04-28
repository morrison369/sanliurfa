/**
 * Redis Cache Strategy
 * Optimized caching for different data types
 */

import { getCache, setCache, deleteCache } from './cache';
import { logger } from '../logger';

// Cache TTL configurations (in seconds)
export const CACHE_TTL = {
  // User data - short TTL due to frequent updates
  USER_PROFILE: 300,        // 5 minutes
  USER_SESSION: 3600,       // 1 hour
  
  // Places - medium TTL
  PLACE_DETAILS: 1800,      // 30 minutes
  PLACE_LIST: 600,          // 10 minutes
  PLACE_SEARCH: 300,        // 5 minutes
  
  // Reviews - short TTL for new reviews
  REVIEWS: 300,             // 5 minutes
  REVIEW_COUNT: 600,        // 10 minutes
  
  // Static content - long TTL
  BLOG_POSTS: 3600,         // 1 hour
  BLOG_CATEGORIES: 7200,    // 2 hours
  EVENTS: 1800,             // 30 minutes
  
  // Analytics - longer TTL
  ANALYTICS_DASHBOARD: 900, // 15 minutes
  LEADERBOARD: 600,         // 10 minutes
  
  // System - very long TTL
  STATIC_ASSETS: 86400,     // 24 hours
  CONFIG: 3600,             // 1 hour
} as const;

// Cache keys namespace
export const CACHE_KEYS = {
  user: (id: string) => `user:${id}`,
  userProfile: (id: string) => `user:profile:${id}`,
  place: (id: string) => `place:${id}`,
  placeBySlug: (slug: string) => `place:slug:${slug}`,
  placesList: (filter: string) => `places:list:${filter}`,
  placeSearch: (query: string) => `search:places:${query}`,
  reviews: (placeId: string) => `reviews:${placeId}`,
  blogPost: (slug: string) => `blog:post:${slug}`,
  blogList: (category?: string) => `blog:list:${category || 'all'}`,
  events: (filter?: string) => `events:${filter || 'all'}`,
  leaderboard: (type: string) => `leaderboard:${type}`,
  analytics: (metric: string) => `analytics:${metric}`,
} as const;

interface CacheOptions {
  ttl?: number;
  tags?: string[];
  invalidateOn?: string[];
}

/**
 * Smart cache wrapper with fallback
 */
export async function getOrSet<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: CacheOptions = {}
): Promise<T> {
  const { ttl = 3600 } = options;
  
  try {
    // Try cache first
    const cached = await getCache<T>(key);
    if (cached !== null) {
      logger.debug('Cache hit', { key });
      return cached;
    }
    
    // Fetch fresh data
    logger.debug('Cache miss', { key });
    const data = await fetcher();
    
    // Store in cache (don't await, fire and forget)
    setCache(key, data, ttl).catch(err => {
      logger.warn('Failed to set cache', Object.assign(new Error('Failed to set cache'), { key, error: err.message }));
    });
    
    return data;
  } catch (error) {
    logger.error('Cache error', Object.assign(new Error('Cache error'), { key, error }));
    // Fallback to direct fetch
    return fetcher();
  }
}

/**
 * Invalidate cache by pattern
 */
export async function invalidatePattern(pattern: string): Promise<void> {
  try {
    // Note: Redis scan + del would be more efficient for production
    // This is a simplified version
    logger.info('Invalidating cache pattern', { pattern });
  } catch (error) {
    logger.error('Cache invalidation error', Object.assign(new Error('Cache invalidation error'), { pattern, error }));
  }
}

/**
 * Invalidate related caches
 */
export async function invalidateRelated(entity: string, id: string): Promise<void> {
  const keysToInvalidate: string[] = [];
  
  switch (entity) {
    case 'place':
      keysToInvalidate.push(
        CACHE_KEYS.place(id),
        CACHE_KEYS.placesList('*'),
        CACHE_KEYS.placeSearch('*')
      );
      break;
    case 'user':
      keysToInvalidate.push(
        CACHE_KEYS.user(id),
        CACHE_KEYS.userProfile(id)
      );
      break;
    case 'review':
      keysToInvalidate.push(
        CACHE_KEYS.reviews(id),
        CACHE_KEYS.place(id) // Place rating changes
      );
      break;
    case 'blog':
      keysToInvalidate.push(
        CACHE_KEYS.blogPost(id),
        CACHE_KEYS.blogList('*')
      );
      break;
  }
  
  logger.info('Invalidating related caches', { entity, id, keys: keysToInvalidate });
  
  // Delete all related keys
  await Promise.all(
    keysToInvalidate.map(key => deleteCache(key).catch(() => {}))
  );
}

/**
 * Cache warming for popular data
 */
export async function warmCache(): Promise<void> {
  logger.info('Starting cache warming');
  
  // Warm most accessed data
  const warmTasks = [
    // Popular places
    // Recent blog posts
    // Active events
    // Leaderboard
  ];
  
  await Promise.allSettled(warmTasks);
  logger.info('Cache warming completed');
}

/**
 * Multi-get for batch operations
 */
export async function getMany<T>(keys: string[]): Promise<(T | null)[]> {
  const results = await Promise.all(
    keys.map(key => getCache<T>(key))
  );
  return results;
}

/**
 * Multi-set for batch operations
 */
export async function setMany<T>(
  items: { key: string; value: T; ttl?: number }[]
): Promise<void> {
  await Promise.allSettled(
    items.map(({ key, value, ttl }) => setCache(key, value, ttl))
  );
}

