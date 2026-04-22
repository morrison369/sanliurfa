import { getOptionalRedisClient, getRedisClient as getSharedRedisClient } from './cache';

/**
 * Compatibility wrapper for older modules.
 *
 * The project has one Redis implementation in `cache.ts`; this file only keeps
 * the old import path alive so separate Redis clients do not create noisy logs
 * or competing connections.
 */
export async function getRedisClient(): Promise<any> {
  if (typeof window !== 'undefined') {
    return null;
  }

  try {
    return await getSharedRedisClient({ silent: true });
  } catch {
    return null;
  }
}

/**
 * Initialize Redis connection
 */
export async function initializeRedis(): Promise<void> {
  await getOptionalRedisClient({ silent: true });
}

/**
 * Close Redis connection
 */
export async function closeRedis(): Promise<void> {
  const client = await getOptionalRedisClient({ silent: true });
  await client?.quit?.();
}
