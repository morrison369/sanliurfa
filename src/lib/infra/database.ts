/**
 * Database Replication & Failover
 * High availability database configuration
 */

import { Pool } from 'pg';
import { logger } from '../logging';

export interface DatabaseNode {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  role: 'primary' | 'replica';
  priority: number;
  isHealthy: boolean;
}

export class DatabaseCluster {
  private nodes: DatabaseNode[] = [];
  private pools: Map<string, Pool> = new Map();
  private currentPrimary: DatabaseNode | null = null;

  constructor(nodes: DatabaseNode[]) {
    this.nodes = nodes;
    this.initializePools();
    setInterval(() => this.checkHealth(), 30000);
  }

  private initializePools(): void {
    for (const node of this.nodes) {
      const pool = new Pool({
        host: node.host,
        port: node.port,
        database: node.database,
        user: node.user,
        password: node.password,
        max: 20,
        connectionTimeoutMillis: 5000,
      });
      this.pools.set(node.host, pool);
      if (node.role === 'primary') this.currentPrimary = node;
    }
  }

  private async checkHealth(): Promise<void> {
    for (const node of this.nodes) {
      try {
        const pool = this.pools.get(node.host);
        const client = await pool!.connect();
        await client.query('SELECT 1');
        client.release();
        node.isHealthy = true;
      } catch {
        node.isHealthy = false;
        if (node.role === 'primary' && node === this.currentPrimary) {
          this.failover();
        }
      }
    }
  }

  private failover(): void {
    const replicas = this.nodes.filter(n => n.role === 'replica' && n.isHealthy);
    if (replicas.length > 0) {
      replicas.sort((a, b) => a.priority - b.priority);
      this.currentPrimary = replicas[0];
      this.currentPrimary.role = 'primary';
      logger.info(`[DB] Failover to ${this.currentPrimary.host}`);
    }
  }

  getPrimaryPool(): Pool | null {
    if (!this.currentPrimary?.isHealthy) return null;
    return this.pools.get(this.currentPrimary.host) || null;
  }

  getReadPool(): Pool | null {
    const replicas = this.nodes.filter(n => n.role === 'replica' && n.isHealthy);
    if (replicas.length === 0) return this.getPrimaryPool();
    return this.pools.get(replicas[0].host) || null;
  }

  async shutdown(): Promise<void> {
    for (const pool of this.pools.values()) await pool.end();
  }
}
