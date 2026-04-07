import type { APIRoute } from 'astro';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../lib/api';
import { metricsCollector } from '../../lib/metrics';
import { updatePoolStatus } from '../../lib/postgres';
import { logger } from '../../lib/logging';

/**
 * GET /api/performance - Get detailed performance metrics (admin only)
 */
export const GET: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  logger.setRequestId(requestId);

  // Only admin can access performance metrics
  if (!locals.isAdmin) {
    logger.warn('Unauthorized performance metrics access attempt', { userId: locals.user?.id });
    return apiError(ErrorCode.FORBIDDEN, 'Unauthorized', HttpStatus.FORBIDDEN, undefined, requestId);
  }

  try {
    // Update pool status before retrieving stats
    updatePoolStatus();

    const perfStats = metricsCollector.getPerformanceStats();
    const metrics = metricsCollector.getMetrics();
    const slowQueries = metricsCollector.getSlowQueries(20);
    const slowOps = metricsCollector.getSlowOperations(20);

    logger.info('Performance metrics retrieved', {
      slowQueryCount: perfStats.slowQueryCount,
      slowRequestCount: perfStats.slowRequestCount,
      avgQueryDuration: perfStats.avgQueryDuration
    });

    return apiResponse(
      {
        timestamp: new Date().toISOString(),
        summary: {
          totalRequests: perfStats.totalRequests,
          slowQueryCount: perfStats.slowQueryCount,
          slowRequestCount: perfStats.slowRequestCount,
          avgQueryDuration: `${perfStats.avgQueryDuration}ms`,
          maxQueryDuration: `${perfStats.maxQueryDuration}ms`
        },
        metrics: {
          totalRequests: metrics.totalRequests,
          errorRate: `${metrics.errorRate}%`,
          slowRequestRate: `${metrics.slowRequestRate}%`,
          cacheHitRate: `${metrics.cacheHitRate}%`,
          avgDuration: `${metrics.avgDuration}ms`,
          p95Duration: `${metrics.p95Duration}ms`,
          slowestEndpoints: metrics.slowestEndpoints
        },
        slowestQueries: slowQueries.map(q => ({
          duration: `${q.duration}ms`,
          rowCount: q.rowCount,
          query: q.query,
          timestamp: new Date(q.timestamp).toISOString()
        })),
        slowOperations: slowOps.map(op => ({
          type: op.type,
          message: op.message,
          duration: `${op.duration}ms`,
          context: op.context,
          timestamp: new Date(op.timestamp).toISOString()
        })),
        databasePool: {
          totalConnections: perfStats.dbPoolStatus.totalConnections,
          activeConnections: perfStats.dbPoolStatus.activeConnections,
          idleConnections: perfStats.dbPoolStatus.idleConnections,
          waitingRequests: perfStats.dbPoolStatus.waitingRequests,
          utilizationPercent: perfStats.dbPoolStatus.totalConnections > 0
            ? Math.round((perfStats.dbPoolStatus.activeConnections / perfStats.dbPoolStatus.totalConnections) * 100)
            : 0
        },
        thresholds: {
          slowQueryMs: 100,
          verySlowQueryMs: 1000,
          slowRequestMs: 500,
          slowCacheMs: 50
        }
      },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    logger.error('Failed to retrieve performance metrics', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to retrieve performance metrics',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
