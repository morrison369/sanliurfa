// Stub for redis-client module
export function getRedisClient(): any {
  return null;
}

export function redisGet(_key: string): Promise<string | null> {
  return Promise.resolve(null);
}

export function redisSet(_key: string, _value: string, _ttl?: number): Promise<void> {
  return Promise.resolve();
}

export function redisDel(_key: string): Promise<void> {
  return Promise.resolve();
}
