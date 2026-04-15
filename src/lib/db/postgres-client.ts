/**
 * Production PostgreSQL client
 * Connection pooling, query building, and transaction support
 */

import { Pool, PoolClient, QueryResult as PgQueryResult } from 'pg';
import { logger } from '../logging';

// Database configuration
const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'sanliurfa',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  
  // Pool configuration
  max: parseInt(process.env.DB_POOL_MAX || '20'),
  min: parseInt(process.env.DB_POOL_MIN || '5'),
  acquireTimeoutMillis: 3000,
  createTimeoutMillis: 3000,
  destroyTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  reapIntervalMillis: 1000,
  createRetryIntervalMillis: 200,
};

// Query result interface
export interface QueryResult<T = any> {
  rows: T[];
  rowCount: number;
  command: string;
}

// Singleton pool instance
let pool: Pool | null = null;

/**
 * Initialize database pool
 */
export function initPool(): Pool {
  if (!pool) {
    pool = new Pool(DB_CONFIG);
    
    // Error handling
    pool.on('error', (err) => {
      logger.error('Unexpected database error:', err);
    });
    
    pool.on('connect', () => {
      logger.info('[DB] New client connected');
    });
    
    pool.on('acquire', () => {
      logger.info('[DB] Client acquired from pool');
    });
    
    pool.on('remove', () => {
      logger.info('[DB] Client removed from pool');
    });
  }
  
  return pool;
}

/**
 * Get pool instance
 */
export function getPool(): Pool {
  return initPool();
}

/**
 * Execute a query with automatic release
 */
export async function query<T = any>(
  sql: string,
  params?: any[]
): Promise<QueryResult<T>> {
  const client = await getPool().connect();
  
  try {
    const start = Date.now();
    const result: PgQueryResult = await client.query(sql, params);
    const duration = Date.now() - start;
    
    if (duration > 1000) {
      logger.warn(`[DB] Slow query (${duration}ms): ${sql.substring(0, 100)}`);
    }
    
    return {
      rows: result.rows,
      rowCount: result.rowCount || 0,
      command: result.command,
    };
  } finally {
    client.release();
  }
}

/**
 * Execute a query and return first row
 */
export async function queryOne<T = any>(
  sql: string,
  params?: any[]
): Promise<T | null> {
  const result = await query<T>(sql, params);
  return result.rows[0] || null;
}

/**
 * Execute multiple queries in a transaction
 */
export async function transaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await getPool().connect();
  
  try {
    await client.query('BEGIN');
    
    try {
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  } finally {
    client.release();
  }
}

/**
 * Insert data and return inserted row
 */
export async function insert<T = any>(
  table: string,
  data: Record<string, any>
): Promise<T> {
  const columns = Object.keys(data);
  const values = Object.values(data);
  const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
  
  const sql = `
    INSERT INTO ${table} (${columns.join(', ')})
    VALUES (${placeholders})
    RETURNING *
  `;
  
  const result = await queryOne<T>(sql, values);
  if (!result) {
    throw new Error('Insert failed');
  }
  return result;
}

/**
 * Update data and return updated rows
 */
export async function update<T = any>(
  table: string,
  data: Record<string, any>,
  whereClause: string,
  whereParams: any[]
): Promise<T[]> {
  const columns = Object.keys(data);
  const values = Object.values(data);
  const setClause = columns.map((col, i) => `${col} = $${i + 1}`).join(', ');
  
  const sql = `
    UPDATE ${table}
    SET ${setClause}
    WHERE ${whereClause}
    RETURNING *
  `;
  
  const result = await query<T>(sql, [...values, ...whereParams]);
  return result.rows;
}

/**
 * Delete data
 */
export async function remove(
  table: string,
  whereClause: string,
  whereParams: any[]
): Promise<number> {
  const sql = `DELETE FROM ${table} WHERE ${whereClause}`;
  const result = await query(sql, whereParams);
  return result.rowCount;
}

/**
 * Build SELECT query with conditions
 */
export function buildSelectQuery(
  table: string,
  options: {
    columns?: string[];
    where?: Record<string, any>;
    orderBy?: string;
    orderDirection?: 'ASC' | 'DESC';
    limit?: number;
    offset?: number;
  }
): { sql: string; params: any[] } {
  const columns = options.columns?.join(', ') || '*';
  let sql = `SELECT ${columns} FROM ${table}`;
  const params: any[] = [];
  
  // WHERE clause
  if (options.where && Object.keys(options.where).length > 0) {
    const whereConditions: string[] = [];
    
    for (const [key, value] of Object.entries(options.where)) {
      if (value === null) {
        whereConditions.push(`${key} IS NULL`);
      } else if (Array.isArray(value)) {
        const placeholders = value.map((_, i) => `$${params.length + i + 1}`).join(', ');
        whereConditions.push(`${key} IN (${placeholders})`);
        params.push(...value);
      } else if (typeof value === 'object' && value.operator) {
        whereConditions.push(`${key} ${value.operator} $${params.length + 1}`);
        params.push(value.value);
      } else {
        whereConditions.push(`${key} = $${params.length + 1}`);
        params.push(value);
      }
    }
    
    sql += ` WHERE ${whereConditions.join(' AND ')}`;
  }
  
  // ORDER BY
  if (options.orderBy) {
    sql += ` ORDER BY ${options.orderBy} ${options.orderDirection || 'ASC'}`;
  }
  
  // LIMIT and OFFSET
  if (options.limit) {
    sql += ` LIMIT $${params.length + 1}`;
    params.push(options.limit);
    
    if (options.offset) {
      sql += ` OFFSET $${params.length + 1}`;
      params.push(options.offset);
    }
  }
  
  return { sql, params };
}

/**
 * Execute paginated query
 */
export async function queryPaginated<T = any>(
  table: string,
  options: {
    columns?: string[];
    where?: Record<string, any>;
    orderBy?: string;
    orderDirection?: 'ASC' | 'DESC';
    page?: number;
    pageSize?: number;
  }
): Promise<{
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}> {
  const page = options.page || 1;
  const pageSize = options.pageSize || 20;
  const offset = (page - 1) * pageSize;
  
  // Get total count
  const countQuery = buildSelectQuery(table, {
    columns: ['COUNT(*) as count'],
    where: options.where,
  });
  const countResult = await queryOne<{ count: string }>(countQuery.sql, countQuery.params);
  const total = parseInt(countResult?.count || '0');
  
  // Get data
  const dataQuery = buildSelectQuery(table, {
    columns: options.columns,
    where: options.where,
    orderBy: options.orderBy,
    orderDirection: options.orderDirection,
    limit: pageSize,
    offset,
  });
  const dataResult = await query<T>(dataQuery.sql, dataQuery.params);
  
  const totalPages = Math.ceil(total / pageSize);
  
  return {
    data: dataResult.rows,
    pagination: {
      page,
      pageSize,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
}

/**
 * Health check
 */
export async function healthCheck(): Promise<{
  healthy: boolean;
  latency: number;
  connections: {
    total: number;
    idle: number;
    waiting: number;
  };
}> {
  const start = Date.now();
  
  try {
    await query('SELECT 1');
    const latency = Date.now() - start;
    
    const pool = getPool();
    
    return {
      healthy: true,
      latency,
      connections: {
        total: pool.totalCount,
        idle: pool.idleCount,
        waiting: pool.waitingCount,
      },
    };
  } catch (error) {
    return {
      healthy: false,
      latency: Date.now() - start,
      connections: {
        total: 0,
        idle: 0,
        waiting: 0,
      },
    };
  }
}

/**
 * Close pool (for graceful shutdown)
 */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    logger.info('[DB] Pool closed');
  }
}

// Initialize on module load
initPool();
