/**
 * Database Read Replica Configuration
 * Phase 2.2: Read Replica Setup
 */

import { Pool, PoolConfig } from 'pg';
import { logger } from '../logging';

// Connection configurations
const PRIMARY_CONFIG: PoolConfig = {
  host: process.env.DB_PRIMARY_HOST || 'localhost',
  port: parseInt(process.env.DB_PRIMARY_PORT || '5432'),
  database: process.env.DB_NAME || 'sanliurfa',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

const REPLICA_CONFIG: PoolConfig = {
  host: process.env.DB_REPLICA_HOST || process.env.DB_PRIMARY_HOST || 'localhost',
  port: parseInt(process.env.DB_REPLICA_PORT || process.env.DB_PRIMARY_PORT || '5432'),
  database: process.env.DB_NAME || 'sanliurfa',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  max: 30, // More connections for read-heavy workload
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

// Query routing rules
const WRITE_OPERATIONS = [
  'INSERT',
  'UPDATE',
  'DELETE',
  'CREATE',
  'ALTER',
  'DROP',
  'TRUNCATE',
  'GRANT',
  'REVOKE',
];

const ANALYTICS_QUERIES = [
  'SELECT COUNT(*)',
  'SELECT SUM(',
  'SELECT AVG(',
  'GROUP BY',
  'WINDOW',
  'OVER (',
];

class DatabaseRouter {
  private primaryPool: Pool;
  private replicaPool: Pool;
  private useReplica: boolean;

  constructor() {
    this.primaryPool = new Pool(PRIMARY_CONFIG);
    this.replicaPool = new Pool(REPLICA_CONFIG);
    this.useReplica = !!process.env.DB_REPLICA_HOST;

    // Health check
    this.startHealthChecks();
  }

  /**
   * Route query to appropriate database
   */
  async query(sql: string, params?: any[]): Promise<any> {
    const isWrite = this.isWriteQuery(sql);
    const isAnalytics = this.isAnalyticsQuery(sql);

    if (isWrite) {
      return this.primaryPool.query(sql, params);
    }

    // Use replica for analytics and simple reads
    if ((isAnalytics || !isWrite) && this.useReplica) {
      try {
        return await this.replicaPool.query(sql, params);
      } catch (error) {
        // Fallback to primary if replica fails
        logger.warn('[DB] Replica failed, falling back to primary');
        return this.primaryPool.query(sql, params);
      }
    }

    return this.primaryPool.query(sql, params);
  }

  /**
   * Force primary for transactional consistency
   */
  async queryPrimary(sql: string, params?: any[]): Promise<any> {
    return this.primaryPool.query(sql, params);
  }

  /**
   * Force replica for analytics
   */
  async queryReplica(sql: string, params?: any[]): Promise<any> {
    if (!this.useReplica) {
      return this.primaryPool.query(sql, params);
    }
    return this.replicaPool.query(sql, params);
  }

  /**
   * Transaction support (always primary)
   */
  async transaction<T>(callback: (client: any) => Promise<T>): Promise<T> {
    const client = await this.primaryPool.connect();
    
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Check if query is a write operation
   */
  private isWriteQuery(sql: string): boolean {
    const upperSql = sql.trim().toUpperCase();
    return WRITE_OPERATIONS.some(op => upperSql.startsWith(op));
  }

  /**
   * Check if query is analytics-heavy
   */
  private isAnalyticsQuery(sql: string): boolean {
    const upperSql = sql.toUpperCase();
    return ANALYTICS_QUERIES.some(pattern => upperSql.includes(pattern));
  }

  /**
   * Health check interval
   */
  private startHealthChecks(): void {
    setInterval(async () => {
      try {
        await this.primaryPool.query('SELECT 1');
        await this.replicaPool.query('SELECT 1');
      } catch (error) {
        logger.error('[DB] Health check failed:', error);
      }
    }, 30000); // Every 30 seconds
  }

  /**
   * Get pool stats
   */
  getStats(): { primary: any; replica: any } {
    return {
      primary: {
        total: this.primaryPool.totalCount,
        idle: this.primaryPool.idleCount,
        waiting: this.primaryPool.waitingCount,
      },
      replica: {
        total: this.replicaPool.totalCount,
        idle: this.replicaPool.idleCount,
        waiting: this.replicaPool.waitingCount,
      },
    };
  }

  /**
   * Graceful shutdown
   */
  async close(): Promise<void> {
    await Promise.all([
      this.primaryPool.end(),
      this.replicaPool.end(),
    ]);
  }
}

// Singleton instance
let router: DatabaseRouter | null = null;

export function getDatabaseRouter(): DatabaseRouter {
  if (!router) {
    router = new DatabaseRouter();
  }
  return router;
}

// Export for use in db.ts
export const dbRouter = {
  query: (sql: string, params?: any[]) => getDatabaseRouter().query(sql, params),
  queryPrimary: (sql: string, params?: any[]) => getDatabaseRouter().queryPrimary(sql, params),
  queryReplica: (sql: string, params?: any[]) => getDatabaseRouter().queryReplica(sql, params),
  transaction: <T>(callback: (client: any) => Promise<T>) => getDatabaseRouter().transaction(callback),
};
