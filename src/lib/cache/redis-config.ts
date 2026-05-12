/**
 * Redis Configuration
 * Production-ready Redis setup
 */

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
  maxRetriesPerRequest: number;
  enableReadyCheck: boolean;
  lazyConnect: boolean;
  keepAlive: number;
  connectTimeout: number;
  commandTimeout: number;
  keyPrefix: string;
}

export const redisConfig: RedisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  ...(process.env.REDIS_PASSWORD ? { password: process.env.REDIS_PASSWORD } : {}),
  db: parseInt(process.env.REDIS_DB || '0', 10),
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: true,
  keepAlive: 30000,
  connectTimeout: 10000,
  commandTimeout: 5000,
  keyPrefix: 'sanliurfa:',
};

// Namespace configurations
export const REDIS_NAMESPACES = {
  SESSION: 'session',
  CACHE: 'cache',
  RATE_LIMIT: 'ratelimit',
  QUEUE: 'queue',
  LOCK: 'lock',
  ANALYTICS: 'analytics',
} as const;

// TTL configurations (in seconds)
export const REDIS_TTL = {
  SESSION: 86400 * 7,        // 7 days
  CACHE_SHORT: 300,          // 5 minutes
  CACHE_MEDIUM: 3600,        // 1 hour
  CACHE_LONG: 86400,         // 1 day
  RATE_LIMIT: 60,            // 1 minute
  LOCK: 30,                  // 30 seconds
} as const;

/**
 * Build Redis key with namespace
 */
export function buildRedisKey(namespace: string, key: string): string {
  return `${redisConfig.keyPrefix}${namespace}:${key}`;
}

/**
 * Parse Redis connection URL
 */
export function parseRedisUrl(url: string): Partial<RedisConfig> {
  try {
    const parsed = new URL(url);
    return {
      host: parsed.hostname,
      port: parseInt(parsed.port, 10) || 6379,
      ...(parsed.password ? { password: parsed.password } : {}),
    };
  } catch {
    return {};
  }
}
