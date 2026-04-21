// Redis Caching Layer with Namespacing
import { createClient } from 'redis';

const redisUrl = process.env.REDIS_URL || import.meta.env.REDIS_URL || 'redis://localhost:6379';
const KEY_PREFIX = process.env.REDIS_KEY_PREFIX || 'sanliurfa:';

let client: ReturnType<typeof createClient> | null = null;
let connectionError: Error | null = null;

/**
 * Get or create Redis client with proper error handling
 */
export async function getRedisClient() {
  if (client && client.isOpen) {
    return client;
  }

  try {
    client = createClient({
      url: redisUrl,
      socket: {
        reconnectStrategy: (retries: number) => {
          const delay = Math.min(retries * 100, 3000);
          return delay;
        }
      }
    });

    client.on('error', (err) => {
      connectionError = err;
      console.error('Redis Client Error:', err);
    });

    client.on('reconnecting', () => {
      console.warn('Redis reconnecting...');
      connectionError = null;
    });

    await client.connect();
    connectionError = null;
    return client;
  } catch (error) {
    connectionError = error instanceof Error ? error : new Error(String(error));
    console.error('Redis connection failed:', connectionError);
    throw connectionError;
  }
}

/**
 * Check if Redis is available
 */
export function isRedisAvailable(): boolean {
  return !connectionError && client?.isOpen === true;
}

/**
 * Add prefix to key
 */
function normalizeCacheKey(key: unknown): string {
  return typeof key === 'string' ? key : JSON.stringify(key);
}

export function prefixKey(key: unknown): string {
  return KEY_PREFIX + normalizeCacheKey(key);
}

/**
 * Get cached value with namespaced key
 */
export async function getCache<T = any>(key: unknown): Promise<T | null> {
  try {
    if (!isRedisAvailable()) {
      return null;
    }
    const redis = await getRedisClient();
    const prefixedKey = prefixKey(key);
    const value = await redis.get(prefixedKey);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    console.error('Cache get error:', { key, error });
    return null;
  }
}

/**
 * Set cached value with namespaced key
 */
export async function setCache(key: unknown, value: any, ttlSeconds = 3600): Promise<void> {
  try {
    if (!isRedisAvailable()) {
      return;
    }
    const redis = await getRedisClient();
    const prefixedKey = prefixKey(key);
    await redis.setEx(prefixedKey, ttlSeconds, JSON.stringify(value));
  } catch (error) {
    console.error('Cache set error:', { key, error });
  }
}

/**
 * Delete cached value with namespaced key
 */
export async function deleteCache(key: unknown): Promise<void> {
  try {
    if (!isRedisAvailable()) {
      return;
    }
    const redis = await getRedisClient();
    const prefixedKey = prefixKey(key);
    await redis.del(prefixedKey);
  } catch (error) {
    console.error('Cache delete error:', { key, error });
  }
}

/**
 * Delete multiple cached values by pattern with namespace
 * WARNING: Uses KEYS command which blocks Redis. Safe for low-volume cache purges only.
 */
export async function deleteCachePattern(pattern: unknown): Promise<void> {
  try {
    if (!isRedisAvailable()) {
      return;
    }
    const redis = await getRedisClient();
    const prefixedPattern = prefixKey(pattern);
    const keys = await redis.keys(prefixedPattern);
    if (keys.length > 0) {
      await redis.del(keys);
    }
  } catch (error) {
    console.error('Cache pattern delete error:', { pattern, error });
  }
}

/**
 * Check rate limit with namespaced key
 * Returns true if allowed, false if limit exceeded
 */
export async function checkRateLimit(key: unknown, limit: number, windowSeconds: number): Promise<boolean> {
  try {
    if (!isRedisAvailable()) {
      console.warn('Redis unavailable for rate limiting, allowing request');
      return true; // Fail-open with warning
    }
    const redis = await getRedisClient();
    const prefixedKey = prefixKey(`ratelimit:${key}`);
    const current = await redis.incr(prefixedKey);

    if (current === 1) {
      await redis.expire(prefixedKey, windowSeconds);
    }

    return current <= limit;
  } catch (error) {
    console.error('Rate limit check error:', { key, error });
    return true; // Allow on error (fail-open)
  }
}

export const redis = {
  get(_key: string): string | null {
    return null;
  },
  setex(key: string, seconds: number, value: string): void {
    void setCache(key, value, seconds);
  },
  del(key: string): void {
    void deleteCache(key);
  },
  lpush(key: string, value: string): void {
    void getCache<string[]>(key).then((list) => {
      const nextList = list || [];
      nextList.unshift(value);
      return setCache(key, nextList);
    });
  },
  ltrim(key: string, start: number, stop: number): void {
    void getCache<string[]>(key).then((list) => setCache(key, (list || []).slice(start, stop + 1)));
  },
  expire(key: string, seconds: number): void {
    void getCache(key).then((value) => {
      if (value !== null) {
        return setCache(key, value, seconds);
      }
      return undefined;
    });
  }
};
