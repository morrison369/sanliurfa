/**
 * Redis Cache Service
 * High-performance caching layer
 */

import { createClient, RedisClientType } from 'redis';
import { logger } from '../logger';

let client: RedisClientType | null = null;
let redisErrorWarned = false;
let redisConnectWarned = false;

function toError(error: unknown): Error {
  if (error instanceof Error) return error;
  return new Error(String(error));
}

export async function getRedisClient(): Promise<RedisClientType | null> {
  if (client?.isOpen) return client;
  
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    logger.debug('Redis not configured');
    return null;
  }

  try {
    client = createClient({ url: redisUrl });
    
    client.on('error', (err) => {
      if (!redisErrorWarned) {
        logger.warn('Redis error detected, cache operations will fail-open until connection is restored', {
          message: err instanceof Error ? err.message : String(err),
        });
        redisErrorWarned = true;
      }
    });

    await client.connect();
    logger.info('Redis connected');
    
    return client;
  } catch (error) {
    if (!redisConnectWarned) {
      logger.warn('Failed to connect to Redis, cache operations will fail-open (logging once)', {
        message: toError(error).message,
      });
      redisConnectWarned = true;
    }
    return null;
  }
}

interface CacheOptions {
  ttl?: number; // seconds
  tags?: string[]; // cache tags for invalidation
}

export async function get<T>(key: string): Promise<T | null> {
  try {
    const redis = await getRedisClient();
    if (!redis) return null;

    const value = await redis.get(key);
    if (!value) return null;

    return JSON.parse(value) as T;
  } catch (error) {
    logger.error('Cache get error', toError(error), { key });
    return null;
  }
}

export async function set<T>(
  key: string,
  value: T,
  options: CacheOptions = {}
): Promise<boolean> {
  try {
    const redis = await getRedisClient();
    if (!redis) return false;

    const serialized = JSON.stringify(value);
    
    if (options.ttl) {
      await redis.setEx(key, options.ttl, serialized);
    } else {
      await redis.set(key, serialized);
    }

    // Add to tags
    if (options.tags) {
      for (const tag of options.tags) {
        await redis.sAdd(`tag:${tag}`, key);
      }
    }

    return true;
  } catch (error) {
    logger.error('Cache set error', toError(error), { key });
    return false;
  }
}

export async function del(key: string): Promise<boolean> {
  try {
    const redis = await getRedisClient();
    if (!redis) return false;

    await redis.del(key);
    return true;
  } catch (error) {
    logger.error('Cache delete error', toError(error), { key });
    return false;
  }
}

export async function invalidateByTag(tag: string): Promise<number> {
  try {
    const redis = await getRedisClient();
    if (!redis) return 0;

    const keys = await redis.sMembers(`tag:${tag}`);
    if (keys.length === 0) return 0;

    await redis.del(keys);
    await redis.del(`tag:${tag}`);

    logger.info(`Invalidated ${keys.length} cache entries for tag: ${tag}`);
    return keys.length;
  } catch (error) {
    logger.error('Cache invalidation error', toError(error), { tag });
    return 0;
  }
}

export async function clear(): Promise<boolean> {
  try {
    const redis = await getRedisClient();
    if (!redis) return false;

    await redis.flushDb();
    logger.info('Cache cleared');
    return true;
  } catch (error) {
    logger.error('Cache clear error', toError(error));
    return false;
  }
}

// Cache-aside pattern wrapper
export async function getOrSet<T>(
  key: string,
  factory: () => Promise<T>,
  options: CacheOptions = {}
): Promise<T> {
  // Try cache first
  const cached = await get<T>(key);
  if (cached !== null) {
    return cached;
  }

  // Generate value
  const value = await factory();

  // Store in cache
  await set(key, value, options);

  return value;
}

// Cache decorator for API routes
export function cacheMiddleware(ttl: number = 300) {
  return async (context: any, next: () => Promise<Response>) => {
    const cacheKey = `api:${context.url.pathname}:${JSON.stringify(context.url.searchParams)}`;
    
    const cached = await get(cacheKey);
    if (cached) {
      return new Response(JSON.stringify(cached), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'X-Cache': 'HIT' }
      });
    }

    const response = await next();
    
    if (response.status === 200) {
      const data = await response.clone().json();
      await set(cacheKey, data, { ttl });
    }

    return response;
  };
}
