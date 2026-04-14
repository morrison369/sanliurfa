/**
 * Redis Cluster & Advanced Caching
 * Task 125: Redis Cluster
 */

import Redis from 'ioredis';

// Redis Cluster configuration
const REDIS_CONFIG = {
  cluster: process.env.REDIS_CLUSTER === 'true',
  nodes: (process.env.REDIS_NODES || 'localhost:6379').split(',').map(node => {
    const [host, port] = node.split(':');
    return { host, port: parseInt(port) };
  }),
  options: {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    retryDelayOnFailover: 100,
  },
};

class RedisClusterManager {
  private client: Redis | Redis.Cluster | null = null;
  private static instance: RedisClusterManager;

  static getInstance(): RedisClusterManager {
    if (!RedisClusterManager.instance) {
      RedisClusterManager.instance = new RedisClusterManager();
    }
    return RedisClusterManager.instance;
  }

  async connect(): Promise<void> {
    if (this.client) return;

    try {
      if (REDIS_CONFIG.cluster && REDIS_CONFIG.nodes.length > 1) {
        this.client = new Redis.Cluster(REDIS_CONFIG.nodes, REDIS_CONFIG.options);
      } else {
        this.client = new Redis({
          host: REDIS_CONFIG.nodes[0].host,
          port: REDIS_CONFIG.nodes[0].port,
        });
      }
      console.log('[Redis] Connected');
    } catch (error) {
      console.error('[Redis] Connection failed:', error);
      this.client = null;
    }
  }

  async get(key: string): Promise<string | null> {
    if (!this.client) return null;
    return this.client.get(key);
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (!this.client) return;
    if (ttl) {
      await this.client.setex(key, ttl, value);
    } else {
      await this.client.set(key, value);
    }
  }

  async del(key: string): Promise<void> {
    if (!this.client) return;
    await this.client.del(key);
  }

  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttl: number = 300
  ): Promise<T> {
    const cached = await this.get(key);
    if (cached) {
      return JSON.parse(cached);
    }

    const value = await factory();
    await this.set(key, JSON.stringify(value), ttl);
    return value;
  }

  async increment(key: string, amount: number = 1): Promise<number> {
    if (!this.client) return 0;
    return this.client.incrby(key, amount);
  }

  async expire(key: string, seconds: number): Promise<void> {
    if (!this.client) return;
    await this.client.expire(key, seconds);
  }

  async healthCheck(): Promise<{ healthy: boolean; nodes: number }> {
    if (!this.client) return { healthy: false, nodes: 0 };
    
    try {
      await this.client.ping();
      const info = await this.client.info('replication');
      const nodes = info.includes('role:master') ? 1 : 0;
      return { healthy: true, nodes };
    } catch {
      return { healthy: false, nodes: 0 };
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
    }
  }
}

export const redisCluster = RedisClusterManager.getInstance();

// Cache strategies
export const CacheStrategies = {
  // Cache-aside (lazy loading)
  async cacheAside<T>(key: string, factory: () => Promise<T>, ttl: number = 300): Promise<T> {
    return redisCluster.getOrSet(key, factory, ttl);
  },

  // Write-through
  async writeThrough<T>(key: string, value: T, ttl: number = 300): Promise<void> {
    await redisCluster.set(key, JSON.stringify(value), ttl);
  },

  // Cache warming
  async warmCache(patterns: Array<{ key: string; factory: () => Promise<any>; ttl: number }>): Promise<void> {
    await Promise.all(patterns.map(p => redisCluster.getOrSet(p.key, p.factory, p.ttl)));
  },

  // Invalidation patterns
  async invalidatePattern(pattern: string): Promise<void> {
    // Implementation depends on Redis version and scan capability
  },
};
