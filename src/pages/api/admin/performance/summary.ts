/**
 * Performance Summary for Admin Dashboard
 * GET: Get comprehensive performance statistics and insights
 */

import type { APIRoute } from 'astro';
import { queryRows, queryOne } from '../../../../lib/postgres';
import { apiResponse, apiError, HttpStatus, ErrorCode } from '../../../../lib/api';
import { logger } from '../../../../lib/logging';

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

    // Get client performance metrics stats
    const performanceStats = await queryOne(`
      SELECT
        COUNT(*) as total_metrics,
        AVG(ttfb) as avg_ttfb,
        AVG(fcp) as avg_fcp,
        AVG(lcp) as avg_lcp,
        AVG(dcl) as avg_dcl,
        PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY ttfb) as p95_ttfb,
        PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY fcp) as p95_fcp,
        PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY lcp) as p95_lcp,
        COUNT(CASE WHEN lcp > 2500 THEN 1 END) as lcp_fails,
        COUNT(CASE WHEN ttfb > 600 THEN 1 END) as ttfb_fails,
        COUNT(CASE WHEN dcl > 3000 THEN 1 END) as dcl_fails
      FROM client_performance_metrics
      WHERE created_at > NOW() - INTERVAL '24 hours'
    `).catch(() => null);

    // Get page-level performance
    const pagePerformance = await queryRows(`
      SELECT
        url,
        COUNT(*) as samples,
        AVG(lcp) as avg_lcp,
        AVG(ttfb) as avg_ttfb,
        AVG(fcp) as avg_fcp,
        MAX(lcp) as max_lcp,
        COUNT(CASE WHEN lcp > 2500 THEN 1 END) as lcp_violations
      FROM client_performance_metrics
      WHERE created_at > NOW() - INTERVAL '24 hours'
      GROUP BY url
      ORDER BY avg_lcp DESC
      LIMIT 10
    `).catch(() => ({ rows: [] }));

    // Get connection type distribution
    const connectionStats = await queryRows(`
      SELECT
        connection_type,
        COUNT(*) as count,
        AVG(lcp) as avg_lcp,
        AVG(ttfb) as avg_ttfb
      FROM client_performance_metrics
      WHERE created_at > NOW() - INTERVAL '24 hours'
      GROUP BY connection_type
    `).catch(() => ({ rows: [] }));

    // Get database stats
    const dbStats = await queryOne(`
      SELECT
        (SELECT count(*) FROM pg_stat_activity) as active_connections,
        (SELECT sum(heap_blks_read) FROM pg_statio_user_tables) as total_disk_reads,
        (SELECT sum(heap_blks_hit) FROM pg_statio_user_tables) as total_cache_hits
      FROM pg_stat_activity LIMIT 1
    `).catch(() => null);

    // Calculate cache hit ratio
    let cacheHitRatio = 0;
    if (dbStats?.total_cache_hits && dbStats?.total_disk_reads) {
      const total = (dbStats.total_cache_hits || 0) + (dbStats.total_disk_reads || 0);
      cacheHitRatio = total > 0 ? (dbStats.total_cache_hits / total) * 100 : 0;
    }

    // Generate recommendations
    const recommendations: string[] = [];

    if (performanceStats?.avg_lcp && performanceStats.avg_lcp > 2500) {
      recommendations.push('LCP needs improvement - consider image optimization and lazy loading');
    }

    if (performanceStats?.avg_ttfb && performanceStats.avg_ttfb > 600) {
      recommendations.push('Server response time is high - check database queries and caching');
    }

    if (cacheHitRatio < 80) {
      recommendations.push('Cache hit ratio below target - review Redis TTLs and invalidation logic');
    }

    if (pagePerformance.some((p: any) => p.lcp_violations > 0)) {
      recommendations.push(`${pagePerformance.filter((p: any) => p.lcp_violations > 0).length} pages have LCP violations`);
    }

    return apiResponse(
      {
        success: true,
        data: {
          performance: {
            stats: performanceStats,
            pages: pagePerformance,
            connectionTypes: connectionStats,
            database: {
              activeConnections: dbStats?.active_connections || 0,
              cacheHitRatio: cacheHitRatio.toFixed(2) + '%'
            }
          },
          recommendations,
          lastUpdated: new Date().toISOString()
        }
      },
      HttpStatus.OK
    );
  } catch (error) {
    logger.error('Performance summary failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to get performance summary',
      HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
};
