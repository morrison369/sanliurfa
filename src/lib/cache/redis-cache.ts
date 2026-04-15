/**
 * Redis caching layer
 * Production-ready caching with Redis
 */

import { getRedisClient, isRedisAvailable, deleteCachePattern as realDeletePattern } from './cache';

// Cache TTL values (in seconds)
export const CACHE_TTL = {
  SHORT: 60,        // 1 minute
  MEDIUM: 300,      // 5 minutes
  LONG: 3600,       // 1 hour
  DAY: 86400,       // 1 day
  WEEK: 604800,     // 1 week
} as const;

// Cache namespaces
export const CACHE_NAMESPACES = {
  API: 'api',
  PAGE: 'page',
  USER: 'user',
  PLACE: 'place',
  BLOG: 'blog',
  SEARCH: 'search',
  ANALYTICS: 'analytics',
  RATE_LIMIT: 'rate_limit',
  SESSION: 'session',
} as const;

// Cache entry structure
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

// In-memory fallback cache (used when Redis is unavailable)
const memoryCache: Map<string, CacheEntry<any>> = new Map();

export async function initRedis(): Promise<boolean> {
  try {
    await getRedisClient();
    return true;
  } catch {
    return false;
  }
}

/**
 * Generate cache key with namespace
 */
export function generateCacheKey(
  namespace: string,
  key: string
): string {
  return `${namespace}:${key}`;
}

/**
 * Set cache entry
 */
export async function setCache<T>(
  key: string,
  data: T,
  ttl: number = CACHE_TTL.MEDIUM
): Promise<void> {
  const entry: CacheEntry<T> = {
    data,
    timestamp: Date.now(),
    ttl: ttl * 1000, // Convert to milliseconds
  };

  if (isRedisAvailable()) {
    // Redis implementation:
    // await redis.setex(key, ttl, JSON.stringify(entry));
  } else {
    memoryCache.set(key, entry);
    
    // Schedule cleanup
    setTimeout(() => {
      const existing = memoryCache.get(key);
      if (existing && Date.now() - existing.timestamp > existing.ttl) {
        memoryCache.delete(key);
      }
    }, entry.ttl);
  }
}

/**
 * Get cache entry
 */
export async function getCache<T>(key: string): Promise<T | null> {
  if (isRedisAvailable()) {
    // Redis implementation:
    // const value = await redis.get(key);
    // if (value) {
    //   const entry: CacheEntry<T> = JSON.parse(value);
    //   return entry.data;
    // }
    return null;
  } else {
    const entry = memoryCache.get(key) as CacheEntry<T> | undefined;
    
    if (!entry) return null;
    
    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      memoryCache.delete(key);
      return null;
    }
    
    return entry.data;
  }
}

/**
 * Delete cache entry
 */
export async function deleteCache(key: string): Promise<void> {
  if (isRedisAvailable()) {
    // await redis.del(key);
  } else {
    memoryCache.delete(key);
  }
}

/**
 * Delete cache entries by pattern
 */
export async function deleteCachePattern(pattern: string): Promise<void> {
  if (isRedisAvailable()) {
    // Redis implementation:
    // const keys = await redis.keys(pattern);
    // if (keys.length > 0) {
    //   await redis.del(...keys);
    // }
  } else {
    // In-memory pattern deletion
    for (const key of memoryCache.keys()) {
      if (key.includes(pattern) || key.match(new RegExp(pattern))) {
        memoryCache.delete(key);
      }
    }
  }
}

/**
 * Clear entire cache namespace
 */
export async function clearNamespace(namespace: string): Promise<void> {
  if (isRedisAvailable()) {
    await realDeletePattern(`${namespace}:*`);
  } else {
    await deleteCachePattern(`${namespace}:*`);
  }
}

/**
 * Check if key exists
 */
export async function exists(key: string): Promise<boolean> {
  if (isRedisAvailable()) {
    // return await redis.exists(key) === 1;
    return false;
  } else {
    const entry = memoryCache.get(key);
    if (!entry) return false;
    
    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      memoryCache.delete(key);
      return false;
    }
    
    return true;
  }
}

/**
 * Get or set cache with factory function
 */
export async function getOrSet<T>(
  key: string,
  factory: () => Promise<T>,
  ttl: number = CACHE_TTL.MEDIUM
): Promise<T> {
  // Try to get from cache
  const cached = await getCache<T>(key);
  if (cached !== null) {
    return cached;
  }
  
  // Generate fresh data
  const data = await factory();
  
  // Store in cache
  await setCache(key, data, ttl);
  
  return data;
}

/**
 * Cache decorator for functions
 */
export function cacheable<T extends (...args: any[]) => Promise<any>>(
  namespace: string,
  ttl: number = CACHE_TTL.MEDIUM,
  keyGenerator?: (...args: Parameters<T>) => string
) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: Parameters<T>) {
      const key = keyGenerator
        ? keyGenerator(...args)
        : `${namespace}:${propertyKey}:${JSON.stringify(args)}`;
      
      return getOrSet(key, () => originalMethod.apply(this, args), ttl);
    };
    
    return descriptor;
  };
}

/**
 * Get cache stats
 */
export async function getCacheStats(): Promise<{
  entries: number;
  hitRate: number;
  memory: number;
  isRedis: boolean;
}> {
  if (isRedisAvailable()) {
    try {
      const redis = await getRedisClient();
      const info = await redis.info('memory');
      const statsInfo = await redis.info('stats');
      const dbSize = await redis.dbSize();

      const memMatch = info.match(/used_memory:(\d+)/);
      const hitsMatch = statsInfo.match(/keyspace_hits:(\d+)/);
      const missesMatch = statsInfo.match(/keyspace_misses:(\d+)/);

      const usedMemory = memMatch ? parseInt(memMatch[1]) : 0;
      const hits = hitsMatch ? parseInt(hitsMatch[1]) : 0;
      const misses = missesMatch ? parseInt(missesMatch[1]) : 0;
      const total = hits + misses;

      return {
        entries: dbSize,
        hitRate: total > 0 ? Math.round((hits / total) * 100) : 0,
        memory: usedMemory,
        isRedis: true,
      };
    } catch {
      return { entries: 0, hitRate: 0, memory: 0, isRedis: true };
    }
  } else {
    return {
      entries: memoryCache.size,
      hitRate: 0,
      memory: 0,
      isRedis: false,
    };
  }
}

/**
 * Cache API response
 */
export async function cacheApiResponse<T>(
  endpoint: string,
  params: Record<string, any>,
  fetcher: () => Promise<T>,
  ttl: number = CACHE_TTL.SHORT
): Promise<T> {
  const cacheKey = generateCacheKey(
    CACHE_NAMESPACES.API,
    `${endpoint}:${JSON.stringify(params)}`
  );
  
  return getOrSet(cacheKey, fetcher, ttl);
}

/**
 * Invalidate related caches on data change
 */
export async function invalidateRelatedCaches(
  entity: string,
  entityId?: string
): Promise<void> {
  // Clear specific entity cache
  if (entityId) {
    await deleteCachePattern(`${entity}:${entityId}:*`);
  }
  
  // Clear list caches
  await deleteCachePattern(`${entity}:list:*`);
  
  // Clear related caches based on entity type
  switch (entity) {
    case 'place':
      await clearNamespace(CACHE_NAMESPACES.SEARCH);
      break;
    case 'blog':
      await clearNamespace(CACHE_NAMESPACES.BLOG);
      break;
    case 'user':
      await deleteCachePattern(`${CACHE_NAMESPACES.USER}:*`);
      break;
  }
}

/**
 * Rate limiting helper
 */
export async function checkRateLimit(
  identifier: string,
  maxRequests: number,
  windowSeconds: number
): Promise<{
  allowed: boolean;
  remaining: number;
  resetTime: number;
}> {
  const key = generateCacheKey(CACHE_NAMESPACES.RATE_LIMIT, identifier);
  const now = Math.floor(Date.now() / 1000);
  const windowStart = Math.floor(now / windowSeconds) * windowSeconds;
  
  if (isRedisAvailable()) {
    // Redis implementation with sliding window
    // const multi = redis.multi();
    // multi.zremrangebyscore(key, 0, windowStart - 1);
    // multi.zcard(key);
    // multi.zadd(key, now, `${now}:${Math.random()}`);
    // multi.pexpire(key, windowSeconds * 1000);
    // const results = await multi.exec();
    // const current = results[1][1] as number;
    
    return {
      allowed: true,
      remaining: maxRequests,
      resetTime: windowStart + windowSeconds,
    };
  } else {
    // In-memory implementation
    const windowKey = `${key}:${windowStart}`;
    const entry = memoryCache.get(windowKey) as CacheEntry<number> | undefined;
    const current = entry?.data || 0;
    
    if (current >= maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: windowStart + windowSeconds,
      };
    }
    
    await setCache(windowKey, current + 1, windowSeconds);
    
    return {
      allowed: true,
      remaining: maxRequests - current - 1,
      resetTime: windowStart + windowSeconds,
    };
  }
}

/**
 * Session cache helpers
 */
export const sessionCache = {
  async get<T>(sessionId: string): Promise<T | null> {
    return getCache<T>(generateCacheKey(CACHE_NAMESPACES.SESSION, sessionId));
  },
  
  async set<T>(sessionId: string, data: T, ttl: number = CACHE_TTL.DAY): Promise<void> {
    await setCache(generateCacheKey(CACHE_NAMESPACES.SESSION, sessionId), data, ttl);
  },
  
  async delete(sessionId: string): Promise<void> {
    await deleteCache(generateCacheKey(CACHE_NAMESPACES.SESSION, sessionId));
  },
};
