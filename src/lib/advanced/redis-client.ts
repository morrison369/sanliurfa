// Stub for redis-client module
export function getRedisClient(): any {
  return null;
}

export function redisGet(key: string): Promise<string | null> {
  return Promise.resolve(null);
}

export function redisSet(key: string, value: string, ttl?: number): Promise<void> {
  return Promise.resolve();
}

export function redisDel(key: string): Promise<void> {
  return Promise.resolve();
}
