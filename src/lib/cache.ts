// Redis Caching Layer with Namespacing
import { createClient } from 'redis';

const configuredRedisUrl = (process.env.REDIS_URL || '').trim();
const redisUrl = configuredRedisUrl || 'redis://127.0.0.1:6379';
const LEGACY_KEY_PREFIX = 'sanliurfa:';
const KEY_PREFIX = normalizeKeyPrefix(process.env.REDIS_KEY_PREFIX || LEGACY_KEY_PREFIX);
const REDIS_ENABLED = resolveRedisEnabled(process.env.REDIS_ENABLED, configuredRedisUrl);
const REDIS_RETRY_INTERVAL_MS = parsePositiveInt('REDIS_RETRY_INTERVAL_MS', 30000);
const REDIS_CONNECT_TIMEOUT_MS = parsePositiveInt('REDIS_CONNECT_TIMEOUT_MS', 1500);
const CACHE_ERROR_LOG_TTL_MS = parsePositiveInt('CACHE_ERROR_LOG_TTL_MS', 60000);

let client: ReturnType<typeof createClient> | null = null;
let connectionError: Error | null = null;
let lastConnectionAttempt = 0;
let unavailableWarningLogged = false;
const lastErrorLogBySignature = new Map<string, number>();
const inMemoryRateLimits = new Map<string, { count: number; resetAt: number }>();

interface RedisClientRequestOptions {
  silent?: boolean;
}

/**
 * Get or create Redis client with proper error handling
 */
export async function getRedisClient(options: RedisClientRequestOptions = {}) {
  if (client && client.isOpen) {
    return client;
  }

  if (!REDIS_ENABLED) {
    throw new Error('Redis is disabled (set REDIS_URL or REDIS_ENABLED=true to enable)');
  }

  const now = Date.now();
  if (connectionError && now - lastConnectionAttempt < REDIS_RETRY_INTERVAL_MS) {
    throw connectionError;
  }

  lastConnectionAttempt = now;

  try {
    client = createClient({
      url: redisUrl,
      socket: {
        connectTimeout: REDIS_CONNECT_TIMEOUT_MS,
        reconnectStrategy: (retries: number) => {
          if (retries > 3) {
            return false;
          }
          const delay = Math.min(retries * 100, 3000);
          return delay;
        }
      }
    });

    client.on('error', (err) => {
      connectionError = err;
      logRedisUnavailableOnce(err);
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
    if (!options.silent) {
      logRedisUnavailableOnce(connectionError);
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

export async function getOptionalRedisClient(options: RedisClientRequestOptions = {}) {
  try {
    return await getRedisClient(options);
  } catch {
    return null;
  }
}

/**
 * Add prefix to key
 */
function normalizeCacheKey(key: unknown): string {
  return typeof key === 'string' ? key : JSON.stringify(key);
}

export function prefixKey(key: unknown): string {
  const normalizedKey = normalizeCacheKey(key);

  if (normalizedKey.startsWith(KEY_PREFIX)) {
    return normalizedKey;
  }

  if (normalizedKey.startsWith(LEGACY_KEY_PREFIX)) {
    return KEY_PREFIX + normalizedKey.slice(LEGACY_KEY_PREFIX.length);
  }

  return KEY_PREFIX + normalizedKey;
}

/**
 * Get cached value with namespaced key
 */
export async function getCache<T = any>(key: unknown): Promise<T | null> {
  try {
    const redis = await getOptionalRedisClient({ silent: true });
    if (!redis) {
      return null;
    }
    const prefixedKey = prefixKey(key);
    const value = await redis.get(prefixedKey);
    return value ? JSON.parse(value) : null;
  } catch (error: unknown) {
    handleRedisCommandFailure(error);
    if (!isRedisAuthError(error) && !isRedisConnectivityError(error)) {
      logCacheError('cache:get', key, error);
    }
    return null;
  }
}

/**
 * Set cached value with namespaced key
 */
export async function setCache(key: unknown, value: any, ttlSeconds = 3600): Promise<void> {
  try {
    const redis = await getOptionalRedisClient({ silent: true });
    if (!redis) {
      return;
    }
    const prefixedKey = prefixKey(key);
    await redis.setEx(prefixedKey, ttlSeconds, JSON.stringify(value));
  } catch (error: unknown) {
    handleRedisCommandFailure(error);
    if (!isRedisAuthError(error) && !isRedisConnectivityError(error)) {
      logCacheError('cache:set', key, error);
    }
  }
}

/**
 * Delete cached value with namespaced key
 */
export async function deleteCache(key: unknown): Promise<void> {
  try {
    const redis = await getOptionalRedisClient({ silent: true });
    if (!redis) {
      return;
    }
    const prefixedKey = prefixKey(key);
    await redis.del(prefixedKey);
  } catch (error: unknown) {
    handleRedisCommandFailure(error);
    if (!isRedisAuthError(error) && !isRedisConnectivityError(error)) {
      logCacheError('cache:delete', key, error);
    }
  }
}

/**
 * Delete multiple cached values by pattern with namespace
 * WARNING: Uses KEYS command which blocks Redis. Safe for low-volume cache purges only.
 */
export async function deleteCachePattern(pattern: unknown): Promise<void> {
  try {
    const redis = await getOptionalRedisClient({ silent: true });
    if (!redis) {
      return;
    }
    const prefixedPattern = prefixKey(pattern);
    const keys = await redis.keys(prefixedPattern);
    if (keys.length > 0) {
      await redis.del(keys);
    }
  } catch (error: unknown) {
    handleRedisCommandFailure(error);
    if (!isRedisAuthError(error) && !isRedisConnectivityError(error)) {
      logCacheError('cache:delete-pattern', pattern, error);
    }
  }
}

/**
 * Check rate limit with namespaced key
 * Returns true if allowed, false if limit exceeded
 */
export async function checkRateLimit(key: unknown, limit: number, windowSeconds: number): Promise<boolean> {
  const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 100;
  const safeWindowSeconds = Number.isFinite(windowSeconds) && windowSeconds > 0 ? Math.floor(windowSeconds) : 900;
  const normalizedKey = normalizeCacheKey(key || 'unknown');

  try {
    const redis = await getOptionalRedisClient({ silent: true });
    if (!redis) {
      if (REDIS_ENABLED) {
        logRedisUnavailableOnce(new Error('Redis unavailable for rate limiting, using in-memory fallback'));
      }
      return checkInMemoryRateLimit(normalizedKey, safeLimit, safeWindowSeconds);
    }
    const prefixedKey = prefixKey(`ratelimit:${normalizedKey}`);
    const current = await redis.incr(prefixedKey);

    if (current === 1) {
      await redis.expire(prefixedKey, safeWindowSeconds);
    }

    return current <= safeLimit;
  } catch (error: unknown) {
    handleRedisCommandFailure(error);
    if (!isRedisAuthError(error) && !isRedisConnectivityError(error)) {
      logCacheError('rate-limit-check', normalizedKey, error);
    }
    return checkInMemoryRateLimit(normalizedKey, safeLimit, safeWindowSeconds);
  }
}

function parsePositiveInt(name: string, fallback: number): number {
  const raw = readNodeEnv(name);
  if (!raw) {
    return fallback;
  }

  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function resolveRedisEnabled(rawValue: string | undefined, redisUrlValue: string): boolean {
  const normalized = (rawValue || '').trim().toLowerCase();
  if (normalized === 'true') {
    return true;
  }
  if (normalized === 'false') {
    return false;
  }

  return redisUrlValue.length > 0;
}

function normalizeKeyPrefix(prefix: string): string {
  const trimmed = prefix.trim();
  if (!trimmed) {
    return LEGACY_KEY_PREFIX;
  }

  return trimmed.endsWith(':') ? trimmed : `${trimmed}:`;
}

function readNodeEnv(key: string): string | undefined {
  const globalProcess = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
  return globalProcess?.env?.[key];
}

function logRedisUnavailableOnce(error: Error): void {
  if (unavailableWarningLogged) {
    return;
  }

  unavailableWarningLogged = true;
  console.warn('Redis unavailable, continuing with graceful degradation:', error.message);
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function isRedisAuthError(error: unknown): boolean {
  const message = toErrorMessage(error).toUpperCase();
  return message.includes('NOAUTH') || message.includes('WRONGPASS');
}

function isRedisConnectivityError(error: unknown): boolean {
  const message = toErrorMessage(error).toUpperCase();
  return (
    message.includes('ECONNREFUSED') ||
    message.includes('ETIMEDOUT') ||
    message.includes('ENOTFOUND') ||
    message.includes('CONNECTION CLOSED') ||
    message.includes('SOCKET CLOSED')
  );
}

function handleRedisCommandFailure(error: unknown): void {
  if (!isRedisAuthError(error)) {
    return;
  }

  const authError = error instanceof Error ? error : new Error(toErrorMessage(error));
  connectionError = authError;
  lastConnectionAttempt = Date.now();

  if (client) {
    void client.quit().catch(() => undefined);
    client = null;
  }

  logRedisUnavailableOnce(
    new Error(`Redis authentication failed, falling back to graceful degradation: ${authError.message}`)
  );
}

function shouldLogNow(signature: string): boolean {
  const now = Date.now();
  const lastLoggedAt = lastErrorLogBySignature.get(signature) || 0;
  if (now - lastLoggedAt < CACHE_ERROR_LOG_TTL_MS) {
    return false;
  }
  lastErrorLogBySignature.set(signature, now);
  return true;
}

function logCacheError(operation: string, key: unknown, error: unknown): void {
  const message = toErrorMessage(error);
  const signature = `${operation}:${message}`;

  if (!shouldLogNow(signature)) {
    return;
  }

  console.warn(`${operation} failed`, {
    key: normalizeCacheKey(key),
    error: message
  });
}

function cleanupInMemoryRateLimitMap(nowSeconds: number): void {
  if (inMemoryRateLimits.size < 2000) {
    return;
  }

  for (const [mapKey, entry] of inMemoryRateLimits.entries()) {
    if (entry.resetAt <= nowSeconds) {
      inMemoryRateLimits.delete(mapKey);
    }
  }
}

function checkInMemoryRateLimit(key: string, limit: number, windowSeconds: number): boolean {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const mapKey = `fallback:${key}`;
  cleanupInMemoryRateLimitMap(nowSeconds);

  const current = inMemoryRateLimits.get(mapKey);
  if (!current || current.resetAt <= nowSeconds) {
    inMemoryRateLimits.set(mapKey, {
      count: 1,
      resetAt: nowSeconds + windowSeconds
    });
    return true;
  }

  current.count += 1;
  inMemoryRateLimits.set(mapKey, current);
  return current.count <= limit;
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
