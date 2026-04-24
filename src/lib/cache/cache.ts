// Redis Caching Layer with Namespacing
import { createClient } from 'redis';
import { logger } from '../logging';

const redisUrl =
  process.env.REDIS_URL ||
  import.meta.env?.REDIS_URL ||
  'redis://127.0.0.1:6381';
const KEY_PREFIX = process.env.REDIS_KEY_PREFIX || import.meta.env?.REDIS_KEY_PREFIX || '';

let client: ReturnType<typeof createClient> | null = null;
let connectionError: Error | null = null;
let rateLimitFallbackWarned = false;
let cacheDeleteFallbackWarned = false;
let cachePatternFallbackWarned = false;
let rateLimitErrorWarned = false;
let redisClientErrorWarned = false;
let redisConnectionFailedWarned = false;

function toError(error: unknown): Error {
  if (error instanceof Error) return error;
  return new Error(String(error));
}

function isRedisConnectionIssue(error: unknown): boolean {
  if (connectionError || !isRedisAvailable()) {
    return true;
  }

  if (error && typeof error === 'object' && Object.keys(error).length === 0) {
    return true;
  }

  const objectMeta =
    error && typeof error === 'object'
      ? `${(error as { code?: unknown }).code || ''} ${(error as { message?: unknown }).message || ''}`
      : '';
  const text =
    error instanceof Error
      ? `${error.name} ${error.message}`
      : `${String(error)} ${objectMeta}`.trim();
  const lowered = text.toLowerCase();
  return (
    lowered.includes('redis') ||
    lowered.includes('socket') ||
    lowered.includes('econnrefused') ||
    lowered.includes('etimedout') ||
    lowered.includes('nr_closed') ||
    lowered.includes('closed') ||
    lowered.includes('connect') ||
    lowered.includes('not open')
  );
}

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
        connectTimeout: 1000,
        reconnectStrategy: (retries: number) => {
          if (retries > 3) return false;
          const delay = Math.min(retries * 100, 3000);
          return delay;
        }
      }
    });

    client.on('error', (err) => {
      connectionError = err;
      if (!redisClientErrorWarned) {
        logger.warn('Redis unavailable, cache and rate limit operations will fail-open (logging once)', {
          message: err instanceof Error ? err.message : String(err),
        });
        redisClientErrorWarned = true;
      }
    });

    client.on('reconnecting', () => {
      logger.warn('Redis reconnecting...');
      connectionError = null;
    });

    await client.connect();
    connectionError = null;
    return client;
  } catch (error) {
    connectionError = error instanceof Error ? error : new Error(String(error));
    if (!redisConnectionFailedWarned) {
      logger.warn('Redis connection failed, continuing with fail-open cache and rate limits (logging once)', {
        message: connectionError.message,
      });
      redisConnectionFailedWarned = true;
    }
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
    const redis = await getRedisClient();
    const prefixedKey = prefixKey(key);
    const value = await redis.get(prefixedKey);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    logger.error('Cache get error', toError(error), { key });
    return null;
  }
}

/**
 * Set cached value with namespaced key
 */
export async function setCache(key: string, value: any, ttlSeconds = 3600): Promise<void> {
  try {
    const redis = await getRedisClient();
    const prefixedKey = prefixKey(key);
    await redis.setEx(prefixedKey, ttlSeconds, JSON.stringify(value));
  } catch (error) {
    logger.error('Cache set error', toError(error), { key });
  }
}

/**
 * Delete cached value with namespaced key
 */
export async function deleteCache(key: string): Promise<void> {
  try {
    const redis = await getRedisClient();
    const prefixedKey = prefixKey(key);
    await redis.del(prefixedKey);
  } catch (error) {
    if (isRedisConnectionIssue(error)) {
      if (!cacheDeleteFallbackWarned) {
        logger.warn('Redis unavailable for cache delete, skipping invalidation (logging once)', { key });
        cacheDeleteFallbackWarned = true;
      }
      return;
    }
    logger.error('Cache delete error', toError(error), { key });
  }
}

/**
 * Delete multiple cached values by pattern with namespace
 * WARNING: Uses KEYS command which blocks Redis. Safe for low-volume cache purges only.
 */
export async function deleteCachePattern(pattern: string): Promise<void> {
  try {
    const redis = await getRedisClient();
    const prefixedPattern = prefixKey(pattern);
    const keys = await redis.keys(prefixedPattern);
    if (keys.length > 0) {
      await redis.del(keys);
    }
  } catch (error) {
    if (isRedisConnectionIssue(error)) {
      if (!cachePatternFallbackWarned) {
        logger.warn(
          'Redis unavailable for cache pattern delete, skipping invalidation (logging once)',
          { pattern },
        );
        cachePatternFallbackWarned = true;
      }
      return;
    }
    logger.error('Cache pattern delete error', toError(error), { pattern });
  }
}

/**
 * Redis client singleton for direct access
 * Note: Prefer using helper functions above for typical operations
 */
export const redis = {
  async setex(key: string, seconds: number, value: string) {
    const client = await getRedisClient();
    return client.setEx(prefixKey(key), seconds, value);
  },
  async lpush(key: string, value: string) {
    const client = await getRedisClient();
    return client.lPush(prefixKey(key), value);
  },
  async ltrim(key: string, start: number, stop: number) {
    const client = await getRedisClient();
    return client.lTrim(prefixKey(key), start, stop);
  },
  async get(key: string) {
    const client = await getRedisClient();
    return client.get(prefixKey(key));
  },
  async del(key: string) {
    const client = await getRedisClient();
    return client.del(prefixKey(key));
  }
};

/**
 * Check rate limit with namespaced key
 * Returns true if allowed, false if limit exceeded
 */
export async function checkRateLimit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  try {
    const redis = await getRedisClient();
    const prefixedKey = prefixKey(`ratelimit:${key}`);
    const current = await redis.incr(prefixedKey);

    if (current === 1) {
      await redis.expire(prefixedKey, windowSeconds);
    }

    return current <= limit;
  } catch (error) {
    if (isRedisConnectionIssue(error)) {
      if (!rateLimitErrorWarned) {
        logger.warn('Redis unavailable for rate limiting, allowing requests (logging once)', {
          key: key || 'unknown',
        });
        rateLimitErrorWarned = true;
      }
      return true;
    }
    logger.error('Rate limit check error', toError(error), { key: key || 'unknown' });
    return true; // Allow on error (fail-open)
  }
}

