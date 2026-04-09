import pg from 'pg';
const { Pool } = pg;
import { metricsCollector, performanceThresholds } from './metrics';
import { logger } from './logging';

// Get DATABASE_URL and READ_REPLICA_URL from environment
const DATABASE_URL = process.env.DATABASE_URL;
const READ_REPLICA_URL = process.env.READ_REPLICA_URL;
const NODE_ENV = process.env.NODE_ENV || 'development';

function parsePositiveInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) {
    return fallback;
  }
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return parsed;
}

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required but not set');
}

const QUERY_TIMEOUT_MS = parsePositiveInt('DB_QUERY_TIMEOUT_MS', 30000);
const POOL_MAX_DEV = parsePositiveInt('DB_POOL_MAX_DEV', 5);
const POOL_MAX_PROD = parsePositiveInt('DB_POOL_MAX_PROD', 20);
const POOL_MIN_DEV = parsePositiveInt('DB_POOL_MIN_DEV', 2);
const POOL_MIN_PROD = parsePositiveInt('DB_POOL_MIN_PROD', 5);

// ==================== CONNECTION POOL CONFIGURATION ====================

/**
 * Adaptive pool configuration based on environment
 * - Development: smaller pool (2-5 connections)
 * - Production: larger pool (5-20 connections) with dynamic scaling
 */
const getPoolConfig = (isDev: boolean) => ({
  ssl: NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: isDev ? POOL_MAX_DEV : POOL_MAX_PROD,
  min: isDev ? POOL_MIN_DEV : POOL_MIN_PROD,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  statement_timeout: QUERY_TIMEOUT_MS,
  query_timeout: QUERY_TIMEOUT_MS,
  // Phase 5: Connection reuse optimization
  application_name: 'sanliurfa-api',
  reapIntervalMillis: 5000, // Reap idle connections every 5s for efficiency
});

const isDev = NODE_ENV !== 'production';

// PostgreSQL write pool (primary)
export const pool = new Pool({
  connectionString: DATABASE_URL,
  ...getPoolConfig(isDev)
});

// Phase 5: Read replica pool for SELECT queries (optional)
export const readReplicaPool = READ_REPLICA_URL ? new Pool({
  connectionString: READ_REPLICA_URL,
  ...getPoolConfig(isDev)
}) : null;

pool.on('error', (err) => {
  logger.error('PostgreSQL pool error', err);
});

if (readReplicaPool) {
  readReplicaPool.on('error', (err) => {
    logger.warn('Read replica pool error, falling back to primary', err);
  });
}

// ==================== POOL STATISTICS & MONITORING ====================

/**
 * Phase 5: Enhanced pool status tracking with per-pool metrics
 */
export function updatePoolStatus(): void {
  const getPoolStats = (p: any, name: string) => {
    const poolState = p._clients || [];
    const idleCount = p._idle ? p._idle.length : 0;
    const totalConnections = poolState.length;
    const activeConnections = totalConnections - idleCount;
    const waitingRequests = p._waitingCount || 0;

    return {
      name,
      totalConnections,
      activeConnections,
      idleConnections: idleCount,
      waitingRequests,
      utilization: totalConnections > 0 ? ((activeConnections / totalConnections) * 100).toFixed(1) : '0'
    };
  };

  const primaryStats = getPoolStats(pool, 'primary');
  const replicaStats = readReplicaPool ? getPoolStats(readReplicaPool, 'replica') : null;

  metricsCollector.setPoolStatus(primaryStats);

  // Phase 5: Log replica pool status if available
  if (replicaStats) {
    metricsCollector.recordSlowOperation(
      'pool',
      `Replica pool utilization: ${replicaStats.utilization}%`,
      0,
      replicaStats
    );
  }
}

// Update pool status periodically (every 30 seconds)
setInterval(updatePoolStatus, 30000);

/**
 * Enhanced pool health monitoring with alerting
 */
function monitorPoolHealth(): void {
  setInterval(() => {
    const poolState = (pool as any)._clients || [];
    const idleCount = (pool as any)._idle ? (pool as any)._idle.length : 0;
    const totalConnections = poolState.length;
    const activeConnections = totalConnections - idleCount;
    const waitingRequests = (pool as any)._waitingCount || 0;

    const utilization = (activeConnections / totalConnections) * 100;

    if (utilization > 80) {
      logger.warn('Connection pool high utilization', {
        utilization: Math.round(utilization),
        active: activeConnections,
        idle: idleCount,
        waiting: waitingRequests
      });
    }

    if (waitingRequests > 5) {
      logger.error('Connection pool saturation detected', {
        waiting: waitingRequests,
        utilization: Math.round(utilization)
      });
    }
  }, 30000); // Check every 30 seconds
}

// Start pool health monitoring
monitorPoolHealth();

// ==================== QUERY HELPERS ====================

/**
 * Phase 5: Query execution with automatic read replica routing
 * - SELECT queries are routed to read replica if available
 * - All other operations go to primary pool
 */
export async function query(text: string, params?: any[], options?: { useReplica?: boolean }) {
  const start = Date.now();
  const isSelect = text.trim().toUpperCase().startsWith('SELECT');

  // Phase 5: Route SELECTs to replica if available and explicitly allowed
  const targetPool = isSelect && options?.useReplica && readReplicaPool ? readReplicaPool : pool;
  const poolName = targetPool === readReplicaPool ? 'replica' : 'primary';

  try {
    const result = await targetPool.query(text, params);
    const duration = Date.now() - start;

    // Record query metrics with pool routing info
    metricsCollector.recordQuery(text, duration, result.rowCount || undefined, undefined, poolName);

    // Log slow queries
    if (duration > performanceThresholds.slowQueryMs) {
      const isVerySlow = duration > 1000;

      if (isVerySlow) {
        metricsCollector.recordSlowOperation(
          'query',
          `Very slow query [${poolName}]: ${text.substring(0, 100)}`,
          duration,
          { rows: result.rowCount, sql: text.substring(0, 200), pool: poolName },
          new Error().stack
        );
        logger.warn('Very slow query detected', {
          duration,
          rows: result.rowCount,
          query: text.substring(0, 100),
          pool: poolName
        });
      } else {
        metricsCollector.recordSlowOperation(
          'query',
          `Slow query [${poolName}]: ${text.substring(0, 100)}`,
          duration,
          { rows: result.rowCount, pool: poolName }
        );
        logger.debug('Slow query detected', {
          duration,
          rows: result.rowCount,
          query: text.substring(0, 100),
          pool: poolName
        });
      }
    }

    return result;
  } catch (error) {
    const duration = Date.now() - start;
    const errorMsg = error instanceof Error ? error.message : String(error);
    metricsCollector.recordQuery(text, duration, undefined, errorMsg, poolName);

    logger.error('Query error', error instanceof Error ? error : new Error(String(error)), {
      query: text.substring(0, 100),
      duration,
      pool: poolName
    });
    throw error;
  }
}

/**
 * Phase 5: Stream large result sets efficiently without loading into memory
 * Use for queries that return many rows (> 1000 rows)
 */
export async function queryStream(text: string, params?: any[], onRow?: (row: any) => Promise<void>) {
  const client = await pool.connect();
  let rowCount = 0;

  try {
    const query = client.query(new (pg as any).Query({
      text,
      values: params,
      rowMode: 'object'
    }));

    return new Promise<number>((resolve, reject) => {
      query.on('row', async (row) => {
        rowCount++;
        if (onRow) {
          try {
            await onRow(row);
          } catch (err) {
            logger.error('Row processing error in stream', err);
          }
        }
      });

      query.on('error', (err) => {
        logger.error('Stream query error', err);
        reject(err);
      });

      query.on('end', () => {
        metricsCollector.recordQuery(text, 0, rowCount);
        resolve(rowCount);
      });
    });
  } finally {
    client.release();
  }
}

/**
 * Execute a query and return the first row or null
 */
export async function queryOne(text: string, params?: any[]) {
  const result = await query(text, params);
  return result.rows[0] || null;
}

/**
 * Execute a query and return all rows
 * Phase 5: Optional streaming for large result sets
 */
export async function queryMany(text: string, params?: any[], options?: { stream?: boolean; onRow?: (row: any) => Promise<void> }) {
  const attachRowsCompat = <T extends any[]>(rows: T): T & { rows: T } => {
    // Backward compatibility: some call-sites expect an array, others expect { rows }.
    return Object.assign(rows, { rows });
  };

  if (options?.stream && options?.onRow) {
    // Stream mode intentionally returns empty array but keeps `rows` compatibility.
    await queryStream(text, params, options.onRow);
    return attachRowsCompat([]);
  }

  const result = await query(text, params);
  return attachRowsCompat(result.rows);
}

/**
 * Execute a transaction with automatic rollback on error
 */
export async function transaction<T>(callback: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
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

// ==================== TABLE SECURITY ====================

/**
 * Allowed table names to prevent SQL injection via table parameter
 * Phase 5: Added loyalty, social, and analytics tables
 */
const ALLOWED_TABLES = new Set([
  'users',
  'places',
  'blog_posts',
  'reviews',
  'comments',
  'favorites',
  'events',
  'historical_sites',
  'reservations',
  'notifications',
  'coupons',
  'categories',
  'tags',
  'messages',
  'points_history',
  'badges',
  'user_badges',
  'place_photos',
  'photo_votes',
  // Phase 16: Loyalty & Rewards
  'loyalty_points',
  'loyalty_tiers',
  'user_achievements',
  'user_badges',
  'rewards',
  'reward_inventory',
  'user_tier_history',
  // Phase 25: Social Features
  'user_activity',
  'followers',
  'mentions',
  'hashtag_index',
  // Phase 28D: Real-time Analytics
  'request_metrics',
  'query_metrics',
  'performance_metrics'
]);

/**
 * Validate that a table name is in the allowed list
 * Throws if table is not allowed
 */
function assertTable(table: string): void {
  if (!ALLOWED_TABLES.has(table)) {
    throw new Error(`Invalid table name: ${table}. Allowed: ${Array.from(ALLOWED_TABLES).join(', ')}`);
  }
}

// ==================== GENERIC ORM HELPERS ====================

/**
 * Get all rows from a table with pagination
 */
export async function getAll(table: string, options?: { limit?: number; offset?: number }) {
  assertTable(table);
  const limit = options?.limit || 100;
  const offset = options?.offset || 0;
  const result = await query(`SELECT * FROM ${table} LIMIT $1 OFFSET $2`, [limit, offset]);
  return result.rows;
}

/**
 * Get a single row by ID
 */
export async function getById(table: string, id: string) {
  assertTable(table);
  return await queryOne(`SELECT * FROM ${table} WHERE id = $1`, [id]);
}

/**
 * Get a single row by slug
 */
export async function getBySlug(table: string, slug: string) {
  assertTable(table);
  return await queryOne(`SELECT * FROM ${table} WHERE slug = $1`, [slug]);
}

/**
 * Insert a new row
 * WARNING: Column names are interpolated. Only use with trusted/validated column names.
 */
export async function insert(table: string, data: Record<string, any>, _legacyReturningFlag?: boolean) {
  assertTable(table);
  const keys = Object.keys(data);
  const values = Object.values(data);

  if (keys.length === 0) {
    throw new Error('No data to insert');
  }

  const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
  const result = await queryOne(`INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders}) RETURNING *`, values);
  return result;
}

/**
 * Update a row by ID
 * WARNING: Column names are interpolated. Only use with trusted/validated column names.
 */
export async function update(
  table: string,
  idOrWhere: string | Record<string, any>,
  data: Record<string, any>,
  idColumn: string = 'id'
) {
  assertTable(table);
  const keys = Object.keys(data);
  const values = Object.values(data);

  if (keys.length === 0) {
    throw new Error('No data to update');
  }

  const setClause = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
  let whereClause = `${idColumn} = $1`;
  let whereParams: any[] = [];

  if (typeof idOrWhere === 'string') {
    whereParams = [idOrWhere];
  } else {
    const whereEntries = Object.entries(idOrWhere);
    if (whereEntries.length === 0) {
      throw new Error('No where condition provided');
    }
    whereClause = whereEntries
      .map(([column], idx) => `${column} = $${idx + 1}`)
      .join(' AND ');
    whereParams = whereEntries.map(([, value]) => value);
  }

  const result = await queryOne(
    `UPDATE ${table} SET ${setClause} WHERE ${whereClause} RETURNING *`,
    [...whereParams, ...values]
  );
  return result;
}

/**
 * Delete a row by ID
 */
export async function remove(table: string, id: string) {
  assertTable(table);
  await query(`DELETE FROM ${table} WHERE id = $1`, [id]);
  return { success: true };
}

// Compatibility alias for modules importing `delete` from this module.
export { remove as delete };

// ==================== BACKWARD COMPATIBILITY ====================

/**
 * Supabase API shim for backward compatibility
 */
export const db = {
  from: (table: string) => ({
    select: async (columns = '*') => {
      assertTable(table);
      const result = await query(`SELECT ${columns} FROM ${table}`);
      return { data: result.rows, error: null };
    },
    selectOne: async (columns = '*') => {
      assertTable(table);
      const result = await queryOne(`SELECT ${columns} FROM ${table}`);
      return { data: result, error: null };
    },
    eq: async (column: string, value: any) => {
      assertTable(table);
      const result = await query(`SELECT * FROM ${table} WHERE ${column} = $1`, [value]);
      return { data: result.rows, error: null };
    },
    eqOne: async (column: string, value: any) => {
      assertTable(table);
      const result = await queryOne(`SELECT * FROM ${table} WHERE ${column} = $1`, [value]);
      return { data: result, error: null };
    },
    insert: async (data: any) => {
      const result = await insert(table, data);
      return { data: result, error: null };
    },
    update: async (data: any) => {
      if (data.id) {
        const { id, ...rest } = data;
        const result = await update(table, id, rest);
        return { data: result, error: null };
      }
      return { data: null, error: { message: 'ID required' } };
    },
    delete: async () => {
      return { data: null, error: { message: 'Use remove() instead' } };
    }
  })
};

export default pool;
