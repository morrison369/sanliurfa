/**
 * Redis Client Stub
 * Placeholder for Redis connection management
 */

export interface RedisClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttl?: number): Promise<void>;
  del(key: string): Promise<void>;
  quit(): Promise<void>;
  connect(): Promise<void>;
}

class RedisStub implements RedisClient {
  private store = new Map<string, { value: string; expires?: number }>();
  private connected = false;

  async connect(): Promise<void> {
    this.connected = true;
    return Promise.resolve();
  }

  async get(key: string): Promise<string | null> {
    const item = this.store.get(key);
    if (!item) return null;
    if (item.expires && Date.now() > item.expires) {
      this.store.delete(key);
      return null;
    }
    return item.value;
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    const expires = ttl ? Date.now() + ttl * 1000 : undefined;
    this.store.set(key, { value, expires });
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }

  async quit(): Promise<void> {
    this.connected = false;
    this.store.clear();
    return Promise.resolve();
  }

  isConnected(): boolean {
    return this.connected;
  }
}

export const redis = new RedisStub();

export function getRedisClient(): RedisClient {
  return redis;
}

export async function connectRedis(): Promise<RedisClient> {
  await redis.connect();
  return redis;
}

export default redis;
