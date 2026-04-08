/**
 * Performance Optimization Utilities
 * 
 * This module provides optimized implementations for high-frequency operations:
 * - Batch inserts instead of N+1 patterns
 * - Fire-and-forget async patterns
 * - Optimized cache key patterns
 * - Enhanced pool management
 */

import { pool } from './postgres';
import { getCache, setCache, deleteCache } from './cache';
import { logger } from './logging';

/**
 * Batch insert multiple records efficiently
 * 
 * @param tableName - Table to insert into
 * @param records - Array of record objects
 * @returns Promise with insert results
 * 
 * Performance: ~100x faster for 1000+ records vs individual inserts
 */
export async function batchInsert(
  tableName: string,
  records: Record<string, any>[]
): Promise<any[]> {
  if (records.length === 0) return [];

  // Build column names from first record
  const columns = Object.keys(records[0]);
  const placeholders = records
    .map((_, i) => {
      const cols = columns.map((_, j) => `$${i * columns.length + j + 1}`);
      return `(${cols.join(',')})`;
    })
    .join(',');

  const values = records.flatMap(r => columns.map(c => r[c]));
  const query = `INSERT INTO ${tableName} (${columns.join(',')}) VALUES ${placeholders} RETURNING *`;

  const startTime = Date.now();
  try {
    const result = await pool.query(query, values);
    const duration = Date.now() - startTime;
    
    if (duration > 500) {
      logger.warn(`Slow batch insert: ${tableName}`, { recordCount: records.length, duration });
    }
    
    return result.rows;
  } catch (error) {
    logger.error(`Batch insert failed: ${tableName}`, error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Fire-and-forget async operation
 * Executes async function without blocking caller
 * 
 * @param operation - Async function to execute
 * @param operationName - Name for logging
 * 
 * Usage: fireAndForget(updateStats(userId), 'updateStats')
 */
export function fireAndForget(
  operation: Promise<any>,
  operationName: string
): void {
  operation.catch(err => {
    logger.error(`Background operation failed: ${operationName}`, 
      err instanceof Error ? err : new Error(String(err)));
  });
}

/**
 * Optimized cache key pattern with automatic invalidation
 */
export class OptimizedCache {
  static readonly CACHE_KEYS = {
    ACHIEVEMENTS_USER: (userId: string) => `sanliurfa:achievements:user:${userId}`,
    ACHIEVEMENTS_STATS: (userId: string) => `sanliurfa:achievements:stats:${userId}`,
    LOYALTY_BALANCE: (userId: string) => `sanliurfa:loyalty:balance:${userId}`,
    FOLLOW_STATS: (userId: string) => `sanliurfa:follow:stats:${userId}`,
    PLATFORM_STATS: 'sanliurfa:platform:stats',
    ADMIN_USERS: (page: number, limit: number) => `sanliurfa:admin:users:${page}:${limit}`,
  };

  /**
   * Get cached data or compute if missing
   */
  static async getOrCompute<T>(
    cacheKey: string,
    computeFn: () => Promise<T>,
    ttlSeconds: number = 300
  ): Promise<T> {
    const cached = await getCache(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const data = await computeFn();
    await setCache(cacheKey, JSON.stringify(data), ttlSeconds);
    return data;
  }

  /**
   * Invalidate user-related caches
   */
  static async invalidateUserCaches(userId: string): Promise<void> {
    const patterns = [
      this.CACHE_KEYS.ACHIEVEMENTS_USER(userId),
      this.CACHE_KEYS.ACHIEVEMENTS_STATS(userId),
      this.CACHE_KEYS.LOYALTY_BALANCE(userId),
      this.CACHE_KEYS.FOLLOW_STATS(userId),
    ];

    await Promise.all(patterns.map(key => deleteCache(key).catch(err => {
      logger.error(`Cache invalidation failed: ${key}`, err instanceof Error ? err : new Error(String(err)));
    })));
  }
}

/**
 * Connection pool health monitoring
 */
export function monitorPoolHealth(): void {
  setInterval(() => {
    const { idleCount, totalCount, waitingCount } = pool;
    const activeCount = totalCount - idleCount;
    const utilization = (activeCount / totalCount) * 100;

    if (utilization > 80) {
      logger.warn('Connection pool high utilization', { 
        utilization: Math.round(utilization),
        active: activeCount,
        idle: idleCount,
        waiting: waitingCount 
      });
    }

    if (waitingCount > 5) {
      logger.error('Connection pool saturation detected', { 
        waiting: waitingCount,
        utilization: Math.round(utilization) 
      });
    }
  }, 30000); // Check every 30 seconds
}

/**
 * Query optimization utilities
 */
export const QueryOptimizations = {
  /**
   * Efficient UPSERT pattern for stats updates
   */
  statsUpsert: (table: string, id: string, data: Record<string, any>) => {
    const keys = Object.keys(data);
    const setClause = keys.map((k, i) => `${k} = $${i + 2}`).join(',');
    const cols = ['id', ...keys];
    const vals = ['$1', ...keys.map((_, i) => `$${i + 2}`)];

    return {
      query: `INSERT INTO ${table} (${cols.join(',')}) VALUES (${vals.join(',')})
               ON CONFLICT (id) DO UPDATE SET ${setClause}`,
      params: [id, ...Object.values(data)]
    };
  },

  /**
   * Select only needed columns (avoid SELECT *)
   */
  selectColumns: (table: string, columns: string[]) => {
    return `SELECT ${columns.join(',')} FROM ${table}`;
  }
};

// Initialize pool monitoring
monitorPoolHealth();

export default {
  batchInsert,
  fireAndForget,
  OptimizedCache,
  QueryOptimizations,
};
