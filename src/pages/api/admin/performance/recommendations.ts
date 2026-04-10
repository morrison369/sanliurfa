/**
 * Performance Optimization Recommendations
 * GET: Get detailed optimization recommendations based on current metrics
 */

import type { APIRoute } from 'astro';
import { queryRows, queryOne } from '../../../../lib/postgres';
import { apiResponse, apiError, HttpStatus, ErrorCode } from '../../../../lib/api';
import { logger } from '../../../../lib/logging';

interface Recommendation {
  priority: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  title: string;
  description: string;
  estimatedImpact: string;
  action: string;
}

export const GET: APIRoute = async ({ locals }) => {
  try {
    // Check admin access
    if (!locals.user || locals.user.role !== 'admin') {
      return apiError(
        ErrorCode.FORBIDDEN,
        'Admin access required',
        HttpStatus.FORBIDDEN
      );
    }

    const recommendations: Recommendation[] = [];

    // Check for missing indexes
    try {
      const unusedIndexes = await queryRows(`
        SELECT schemaname, tablename, indexname
        FROM pg_stat_user_indexes
        WHERE idx_scan = 0 AND idx_tup_read = 0
        ORDER BY pg_relation_size(indexrelid) DESC
        LIMIT 5
      `);

      if (unusedIndexes && unusedIndexes.length > 0) {
        recommendations.push({
          priority: 'medium',
          category: 'Database Indexes',
          title: `${unusedIndexes.length} Unused Indexes Found`,
          description: `Found ${unusedIndexes.length} indexes that are never used. Removing them will free up disk space and speed up writes.`,
          estimatedImpact: 'Medium - Improves write performance',
          action: `DROP INDEX IF EXISTS ${unusedIndexes.map((r: any) => r.indexname).join(', ')};`
        });
      }
    } catch (e) {
      // Table might not exist yet
    }

    // Check for large tables without indexes
    try {
      const largeUnindexedTables = await queryRows(`
        SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
        FROM pg_tables
        WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
        AND NOT EXISTS (
          SELECT 1 FROM pg_indexes WHERE pg_indexes.tablename = pg_tables.tablename
        )
        ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
        LIMIT 5
      `);

      if (largeUnindexedTables && largeUnindexedTables.length > 0) {
        recommendations.push({
          priority: 'high',
          category: 'Database Indexes',
          title: 'Large Tables Without Indexes',
          description: `Found large tables without any indexes. Add indexes on frequently queried columns to improve query performance.`,
          estimatedImpact: 'High - Major query performance improvement',
          action: 'Review frequently queried columns and create appropriate indexes'
        });
      }
    } catch (e) {
      // Table might not exist yet
    }

    // Check for dead rows
    try {
      const deadRowStats = await queryOne(`
        SELECT
          SUM(n_dead_tup) as total_dead_rows,
          SUM(n_live_tup) as total_live_rows,
          COUNT(*) as table_count
        FROM pg_stat_user_tables
        WHERE n_dead_tup > 1000
      `);

      if (deadRowStats && deadRowStats.total_dead_rows > 10000) {
        recommendations.push({
          priority: 'medium',
          category: 'Database Maintenance',
          title: `${Math.round(deadRowStats.total_dead_rows / 1000)}K Dead Rows`,
          description: 'High number of dead rows detected. Run VACUUM to reclaim storage and improve performance.',
          estimatedImpact: 'Medium - Better storage utilization',
          action: 'VACUUM ANALYZE; -- Run during low-traffic period'
        });
      }
    } catch (e) {
      // Table might not exist yet
    }

    // Check query performance
    try {
      const slowQueries = await queryRows(`
        SELECT query, mean_time, calls
        FROM pg_stat_statements
        WHERE mean_time > 100
        ORDER BY mean_time DESC
        LIMIT 5
      `);

      if (slowQueries && slowQueries.length > 0) {
        const avgTime = slowQueries.reduce((sum: number, q: any) => sum + q.mean_time, 0) / slowQueries.length;
        recommendations.push({
          priority: avgTime > 500 ? 'high' : 'medium',
          category: 'Query Performance',
          title: `${slowQueries.length} Slow Queries Detected`,
          description: `Found ${slowQueries.length} queries with avg execution time > 100ms. Optimize these queries with appropriate indexes and query refactoring.`,
          estimatedImpact: 'High - Significant response time improvement',
          action: 'Use EXPLAIN ANALYZE to identify bottlenecks and add missing indexes'
        });
      }
    } catch (e) {
      // pg_stat_statements may not be enabled
    }

    // Check cache configuration
    try {
      const connections = await queryOne(`
        SELECT count(*) as connection_count FROM pg_stat_activity
      `);

      if (connections && connections.connection_count > 15) {
        recommendations.push({
          priority: 'medium',
          category: 'Connection Management',
          title: 'High Connection Count',
          description: 'Currently using many database connections. Consider increasing Redis cache TTLs or implementing query result caching.',
          estimatedImpact: 'Medium - Reduced database load',
          action: 'Review Redis TTLs in code and increase for stable data'
        });
      }
    } catch (e) {
      // Error checking connections
    }

    // Add generic recommendations if none found
    if (recommendations.length === 0) {
      recommendations.push({
        priority: 'low',
        category: 'General',
        title: 'Database Performance Looks Good',
        description: 'No immediate optimization opportunities detected. Continue monitoring performance metrics.',
        estimatedImpact: 'Low',
        action: 'Monitor Core Web Vitals dashboard for client-side improvements'
      });
    }

    return apiResponse(
      {
        success: true,
        data: {
          recommendations: recommendations.sort((a, b) => {
            const priorityMap = { critical: 0, high: 1, medium: 2, low: 3 };
            return priorityMap[a.priority] - priorityMap[b.priority];
          }),
          lastAnalyzed: new Date().toISOString()
        }
      },
      HttpStatus.OK
    );
  } catch (error) {
    logger.error('Performance recommendations failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to generate recommendations',
      HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
};
