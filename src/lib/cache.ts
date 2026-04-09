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
export function prefixKey(key: string): string {
  return KEY_PREFIX + key;
}

/**
 * Get cached value with namespaced key
 */
export async function getCache<T>(key: string): Promise<T | null> {
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
export async function setCache(key: string, value: any, ttlSeconds = 3600): Promise<void> {
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
export async function deleteCache(key: string): Promise<void> {
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
export async function deleteCachePattern(pattern: string): Promise<void> {
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
export async function checkRateLimit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
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

/**
 * Legacy compatibility facade used by older modules (`import { redis } from './cache'`).
 * It forwards any method call to the underlying Redis client lazily.
 */
export const redis = new Proxy(
  {},
  {
    get(_target, propKey) {
      if (typeof propKey !== 'string') {
        return undefined;
      }
      return async (...args: any[]) => {
        const c = await getRedisClient();
        const fn = (c as any)[propKey];
        if (typeof fn !== 'function') {
          throw new Error(`Redis method not found: ${propKey}`);
        }
        return fn.apply(c, args);
      };
    }
  }
) as any;
