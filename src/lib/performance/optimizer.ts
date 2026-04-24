/**
 * Performance Optimization Module
 * Profiling and optimization recommendations
 */

import { query } from '../postgres';

export interface PerformanceProfile {
  slowQueries: SlowQuery[];
  unusedIndexes: string[];
  missingIndexes: MissingIndex[];
  tableSizes: TableSize[];
  cacheHitRatio: number;
  recommendations: Recommendation[];
}

export interface SlowQuery {
  query: string;
  calls: number;
  avgTime: number;
  totalTime: number;
}

export interface MissingIndex {
  table: string;
  column: string;
  scanCount: number;
}

export interface TableSize {
  table: string;
  size: string;
  rowCount: number;
}

export interface Recommendation {
  type: 'query' | 'index' | 'cache' | 'config';
  priority: 'high' | 'medium' | 'low';
  description: string;
  impact: string;
  solution: string;
}

/**
 * Analyze database performance
 */
export async function analyzePerformance(): Promise<PerformanceProfile> {
  const [slowQueries, unusedIndexes, tableSizes, cacheStats] = await Promise.all([
    getSlowQueries(),
    getUnusedIndexes(),
    getTableSizes(),
    getCacheStats(),
  ]);

  const recommendations: Recommendation[] = [];

  // Generate recommendations
  if (slowQueries.length > 0) {
    recommendations.push({
      type: 'query',
      priority: 'high',
      description: `${slowQueries.length} slow queries detected`,
      impact: 'High database load',
      solution: 'Optimize queries or add indexes',
    });
  }

  if (unusedIndexes.length > 5) {
    recommendations.push({
      type: 'index',
      priority: 'medium',
      description: `${unusedIndexes.length} unused indexes`,
      impact: 'Slows down writes',
      solution: 'Remove unused indexes',
    });
  }

  const cacheHitRatio = parseFloat(cacheStats[0]?.ratio || '0');
  if (cacheHitRatio < 0.95) {
    recommendations.push({
      type: 'cache',
      priority: 'high',
      description: `Cache hit ratio is ${(cacheHitRatio * 100).toFixed(1)}%`,
      impact: 'High disk I/O',
      solution: 'Increase shared_buffers',
    });
  }

  return {
    slowQueries,
    unusedIndexes,
    missingIndexes: [], // Would need pg_stat_statements
    tableSizes,
    cacheHitRatio,
    recommendations,
  };
}

async function getSlowQueries(): Promise<SlowQuery[]> {
  const result = await query(`
    SELECT query, calls, mean_time as avg_time, total_time
    FROM pg_stat_statements
    WHERE mean_time > 100
    ORDER BY mean_time DESC
    LIMIT 10
  `).catch(() => ({ rows: [] }));

  return result.rows.map((r: any) => ({
    query: r.query.substring(0, 100),
    calls: parseInt(r.calls),
    avgTime: parseFloat(r.avg_time),
    totalTime: parseFloat(r.total_time),
  }));
}

async function getUnusedIndexes(): Promise<string[]> {
  const result = await query(`
    SELECT schemaname || '.' || relname || '.' || indexrelname as index_name
    FROM pg_stat_user_indexes
    WHERE idx_scan = 0
    AND schemaname = 'public'
    LIMIT 20
  `);

  return result.rows.map((r: any) => r.index_name);
}

async function getTableSizes(): Promise<TableSize[]> {
  const result = await query(`
    SELECT relname as table,
           pg_size_pretty(pg_total_relation_size(relid)) as size,
           n_live_tup as row_count
    FROM pg_stat_user_tables
    ORDER BY pg_total_relation_size(relid) DESC
    LIMIT 20
  `);

  return result.rows.map((r: any) => ({
    table: r.table,
    size: r.size,
    rowCount: parseInt(r.row_count),
  }));
}

async function getCacheStats(): Promise<any[]> {
  const result = await query(`
    SELECT round(blks_hit::numeric / (blks_hit + blks_read), 4) as ratio
    FROM pg_stat_database
    WHERE datname = current_database()
  `);

  return result.rows;
}

/**
 * Optimize images batch
 */
export async function optimizeImages(_options: {
  quality?: number;
  maxWidth?: number;
  concurrency?: number;
} = {}): Promise<{ processed: number; saved: number }> {
  // Implementation would use Sharp
  return { processed: 0, saved: 0 };
}

/**
 * Cleanup and maintenance
 */
export async function runMaintenance(): Promise<{
  vacuumed: string[];
  analyzed: string[];
}> {
  const tables = ['places', 'reviews', 'users', 'page_views'];
  
  for (const table of tables) {
    await query(`VACUUM ANALYZE ${table}`);
  }

  return {
    vacuumed: tables,
    analyzed: tables,
  };
}
