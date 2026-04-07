import pg from 'pg';
const { Pool } = pg;
import { metricsCollector, performanceThresholds } from './metrics';
import { logger } from './logging';

// Get DATABASE_URL from environment
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required but not set');
}

// PostgreSQL connection pool
export const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  min: 2,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  console.error('PostgreSQL pool error:', err);
});

/**
 * Update database pool status metrics
 */
export function updatePoolStatus(): void {
  const poolState = (pool as any)._clients || [];
  const idleCount = (pool as any)._idle ? (pool as any)._idle.length : 0;
  const totalConnections = poolState.length;
  const activeConnections = totalConnections - idleCount;
  const waitingRequests = (pool as any)._waitingCount || 0;

  metricsCollector.setPoolStatus({
    totalConnections,
    activeConnections,
    idleConnections: idleCount,
    waitingRequests
  });
}

// Update pool status periodically
setInterval(updatePoolStatus, 30000); // Every 30 seconds

// ==================== QUERY HELPERS ====================

/**
 * Execute a SQL query with parameters (parameterized to prevent SQL injection)
 */
export async function query(text: string, params?: any[]) {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;

    // Record query metrics
    metricsCollector.recordQuery(text, duration, result.rowCount || undefined);

    // Log slow queries
    if (duration > performanceThresholds.slowQueryMs) {
      const isSlow = duration > performanceThresholds.slowQueryMs;
      const isVerySlow = duration > 1000;

      if (isVerySlow) {
        // Log very slow queries (> 1000ms) with warning level
        metricsCollector.recordSlowOperation(
          'query',
          `Very slow query: ${text.substring(0, 100)}`,
          duration,
          { rows: result.rowCount, sql: text.substring(0, 200) },
          new Error().stack
        );
        logger.warn('Very slow query detected', {
          duration,
          rows: result.rowCount,
          query: text.substring(0, 100)
        });
      } else {
        // Log moderately slow queries (> 100ms) at debug level
        metricsCollector.recordSlowOperation(
          'query',
          `Slow query: ${text.substring(0, 100)}`,
          duration,
          { rows: result.rowCount }
        );
        logger.debug('Slow query detected', {
          duration,
          rows: result.rowCount,
          query: text.substring(0, 100)
        });
      }
    }

    return result;
  } catch (error) {
    const duration = Date.now() - start;
    metricsCollector.recordQuery(text, duration, undefined, error instanceof Error ? error.message : String(error));

    logger.error('Query error', error instanceof Error ? error : new Error(String(error)), {
      query: text.substring(0, 100),
      duration
    });
    throw error;
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
 */
export async function queryMany(text: string, params?: any[]) {
  const result = await query(text, params);
  return result.rows;
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
  'user_badges'
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
export async function insert(table: string, data: Record<string, any>) {
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
export async function update(table: string, id: string, data: Record<string, any>) {
  assertTable(table);
  const keys = Object.keys(data);
  const values = Object.values(data);

  if (keys.length === 0) {
    throw new Error('No data to update');
  }

  const setClause = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
  const result = await queryOne(`UPDATE ${table} SET ${setClause} WHERE id = $1 RETURNING *`, [id, ...values]);
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
