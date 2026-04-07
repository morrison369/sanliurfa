/**
 * Redis client singleton with connection management
 */

let redisClient: any = null;

/**
 * Get or create Redis client
 */
export function getRedisClient(): any {
  if (typeof window !== 'undefined') {
    // Client-side, no Redis
    return null;
  }

  if (redisClient) {
    return redisClient;
  }

  try {
    const redis = require('redis');
    const url = process.env.REDIS_URL || 'redis://localhost:6379';

    redisClient = redis.createClient({ url });

    redisClient.on('error', (err: Error) => {
      console.error('Redis error:', err);
    });

    redisClient.on('connect', () => {
      console.log('[Redis] Connected');
    });

    redisClient.on('ready', () => {
      console.log('[Redis] Ready');
    });

    return redisClient;
  } catch (error) {
    console.error('[Redis] Failed to create client:', error);
    return null;
  }
}

/**
 * Initialize Redis connection
 */
export async function initializeRedis(): Promise<void> {
  const client = getRedisClient();
  if (!client) return;

  try {
    await client.connect();
    console.log('[Redis] Initialized successfully');
  } catch (error) {
    console.error('[Redis] Initialization failed:', error);
  }
}

/**
 * Close Redis connection
 */
export async function closeRedis(): Promise<void> {
  if (redisClient) {
    try {
      await redisClient.quit();
      redisClient = null;
      console.log('[Redis] Connection closed');
    } catch (error) {
      console.error('[Redis] Close failed:', error);
    }
  }
}
