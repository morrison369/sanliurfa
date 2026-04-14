/**
 * Redis Cluster Setup
 * High availability Redis configuration
 */

import Redis from 'ioredis';

export interface RedisNode {
  host: string;
  port: number;
  role: 'master' | 'slave';
}

export class RedisCluster {
  private cluster: Redis.Cluster | null = null;
  private nodes: RedisNode[] = [];

  constructor(nodes: RedisNode[]) {
    this.nodes = nodes;
  }

  connect(): Redis.Cluster {
    const startupNodes = this.nodes.map(n => ({ host: n.host, port: n.port }));

    this.cluster = new Redis.Cluster(startupNodes, {
      scaleReads: 'slave',
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
      retryDelayOnClusterDown: 300,
      enableReadyCheck: true,
    });

    this.cluster.on('connect', () => console.log('[RedisCluster] Connected'));
    this.cluster.on('error', (err) => console.error('[RedisCluster] Error:', err));
    this.cluster.on('node error', (err, node) => console.error(`[RedisCluster] Node ${node.options.host} error:`, err));

    return this.cluster;
  }

  getClient(): Redis.Cluster {
    if (!this.cluster) return this.connect();
    return this.cluster;
  }

  async getInfo(): Promise<Record<string, any>> {
    if (!this.cluster) return {};
    return this.cluster.cluster('INFO');
  }

  async getNodes(): Promise<string[]> {
    if (!this.cluster) return [];
    return this.cluster.nodes('all').map(n => `${n.options.host}:${n.options.port}`);
  }

  async disconnect(): Promise<void> {
    if (this.cluster) {
      await this.cluster.quit();
      this.cluster = null;
    }
  }
}

// Redis Sentinel for HA
export class RedisSentinel {
  private redis: Redis | null = null;
  private sentinels: { host: string; port: number }[] = [];
  private masterName: string;

  constructor(sentinels: { host: string; port: number }[], masterName = 'mymaster') {
    this.sentinels = sentinels;
    this.masterName = masterName;
  }

  connect(): Redis {
    this.redis = new Redis({
      sentinels: this.sentinels,
      name: this.masterName,
      retryDelayOnFailover: 100,
    });

    return this.redis;
  }

  getClient(): Redis {
    if (!this.redis) return this.connect();
    return this.redis;
  }
}
