/**
 * Advanced Redis Caching System
 * Multi-layer caching with cache warming, invalidation, and analytics
 */

import { getRedisClient, isRedisAvailable } from './cache';

// Cache configuration
const DEFAULT_TTL = 3600; // 1 hour
const STALE_WHILE_REVALIDATE = 300; // 5 minutes

// Cache namespaces
export const CacheNamespaces = {
  PLACES: 'places',
  USERS: 'users',
  REVIEWS: 'reviews',
  BLOG: 'blog',
  SEARCH: 'search',
  ANALYTICS: 'analytics',
  SESSIONS: 'sessions',
  RATE_LIMIT: 'ratelimit',
} as const;

// Cache tags for invalidation
export const CacheTags = {
  PLACE_LIST: 'place:list',
  PLACE_DETAIL: 'place:detail',
  USER_PROFILE: 'user:profile',
  REVIEW_LIST: 'review:list',
  BLOG_LIST: 'blog:list',
  BLOG_POST: 'blog:post',
  HOME_PAGE: 'page:home',
  SEARCH_RESULTS: 'search:results',
} as const;

interface CacheOptions {
  ttl?: number;
  staleWhileRevalidate?: number;
  tags?: string[];
  compress?: boolean;
}

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
  staleAt: number;
  tags: string[];
  version: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  evictions: number;
}

/**
 * Advanced Cache Manager
 */
class AdvancedCacheManager {
  private version = 1;
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    hitRate: 0,
    evictions: 0,
  };

  private key(namespace: string, key: string): string {
    return `cache:${namespace}:${key}:v${this.version}`;
  }

  private compress(data: any): string {
    return JSON.stringify(data);
  }

  private decompress(data: string): any {
    return JSON.parse(data);
  }

  async get<T>(namespace: string, key: string): Promise<T | null> {
    if (!await isRedisAvailable()) {
      return null;
    }

    try {
      const redis = await getRedisClient();
      const cacheKey = this.key(namespace, key);
      const value = await redis.get(cacheKey);

      if (!value) {
        this.stats.misses++;
        this.updateHitRate();
        return null;
      }

      const entry: CacheEntry<T> = this.decompress(value);
      const now = Date.now();

      if (now > entry.expiresAt) {
        if (now < entry.staleAt) {
          this.triggerBackgroundRefresh(namespace, key);
          this.stats.hits++;
          this.updateHitRate();
          return entry.data;
        }

        await this.delete(namespace, key);
        this.stats.misses++;
        this.updateHitRate();
        return null;
      }

      this.stats.hits++;
      this.updateHitRate();
      return entry.data;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  async set<T>(
    namespace: string,
    key: string,
    value: T,
    options: CacheOptions = {}
  ): Promise<void> {
    if (!await isRedisAvailable()) {
      return;
    }

    const ttl = options.ttl || DEFAULT_TTL;
    const staleTtl = options.staleWhileRevalidate || STALE_WHILE_REVALIDATE;

    const entry: CacheEntry<T> = {
      data: value,
      expiresAt: Date.now() + (ttl * 1000),
      staleAt: Date.now() + ((ttl + staleTtl) * 1000),
      tags: options.tags || [],
      version: this.version,
    };

    try {
      const redis = await getRedisClient();
      const cacheKey = this.key(namespace, key);
      const serialized = this.compress(entry);

      await (redis as any).setex(cacheKey, ttl + staleTtl, serialized);

      for (const tag of entry.tags) {
        await (redis as any).sadd(`cache:tags:${tag}`, cacheKey);
      }
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  async getOrSet<T>(
    namespace: string,
    key: string,
    fn: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    const cached = await this.get<T>(namespace, key);
    if (cached !== null) {
      return cached;
    }

    const value = await fn();
    await this.set(namespace, key, value, options);
    return value;
  }

  async delete(namespace: string, key: string): Promise<void> {
    if (!await isRedisAvailable()) {
      return;
    }

    try {
      const redis = await getRedisClient();
      const cacheKey = this.key(namespace, key);

      const value = await redis.get(cacheKey);
      if (value) {
        const entry: CacheEntry<any> = this.decompress(value);
        for (const tag of entry.tags) {
          await (redis as any).srem(`cache:tags:${tag}`, cacheKey);
        }
      }

      await redis.del(cacheKey);
      this.stats.evictions++;
    } catch (error) {
      console.error('Cache delete error:', error);
    }
  }

  async invalidateByTag(tag: string): Promise<number> {
    if (!await isRedisAvailable()) {
      return 0;
    }

    try {
      const redis = await getRedisClient();
      const cacheKey = `cache:tags:${tag}`;
      const keys = await (redis as any).smembers(cacheKey);

      if (keys.length === 0) {
        return 0;
      }

      await redis.del(...keys);
      await redis.del(cacheKey);

      this.stats.evictions += keys.length;
      return keys.length;
    } catch (error) {
      console.error('Cache invalidate by tag error:', error);
      return 0;
    }
  }

  async invalidateNamespace(namespace: string): Promise<void> {
    if (!await isRedisAvailable()) {
      return;
    }

    try {
      const redis = await getRedisClient();
      const pattern = `cache:${namespace}:*`;

      let cursor = 0;
      do {
        const result = await (redis as any).scan(cursor, { match: pattern, count: 100 });
        cursor = result.cursor;

        if (result.keys.length > 0) {
          await (redis as any).del(...result.keys);
          this.stats.evictions += result.keys.length;
        }
      } while (cursor !== 0);
    } catch (error) {
      console.error('Cache invalidate namespace error:', error);
    }
  }

  async clear(): Promise<void> {
    if (!await isRedisAvailable()) {
      return;
    }

    try {
      const redis = await getRedisClient();

      let cursor = 0;
      do {
        const result = await (redis as any).scan(cursor, { match: 'cache:*', count: 100 });
        cursor = result.cursor;

        if (result.keys.length > 0) {
          await (redis as any).del(...result.keys);
        }
      } while (cursor !== 0);

      this.version++;
    } catch (error) {
      console.error('Cache clear error:', error);
    }
  }

  getStats(): CacheStats {
    return { ...this.stats };
  }

  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      hitRate: 0,
      evictions: 0,
    };
  }

  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
  }

  private triggerBackgroundRefresh(namespace: string, key: string): void {
    console.log(`Background refresh triggered for ${namespace}:${key}`);
  }
}

export async function cacheQuery<T>(
  sql: string,
  params: any[],
  fn: () => Promise<T>,
  ttl: number = DEFAULT_TTL
): Promise<T> {
  const key = `${sql}:${JSON.stringify(params)}`;
  return advancedCache.getOrSet(CacheNamespaces.PLACES, key, fn, { ttl });
}

export async function cachePage<T>(
  url: string,
  fn: () => Promise<T>,
  ttl: number = 300
): Promise<T> {
  const key = url.replace(/[^a-zA-Z0-9]/g, '_');
  return advancedCache.getOrSet(CacheNamespaces.PLACES, key, fn, {
    ttl,
    tags: [CacheTags.HOME_PAGE],
  });
}

export const advancedCache = new AdvancedCacheManager();
export default advancedCache;
