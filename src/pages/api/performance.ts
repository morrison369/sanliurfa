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
    const oauthAuthorizeMetrics = metricsCollector.getEndpointMetrics('GET', '/api/auth/oauth/authorize');
    const oauthCallbackMetrics = metricsCollector.getEndpointMetrics('GET', '/api/auth/oauth/callback');
    const webhookStripeMetrics = metricsCollector.getEndpointMetrics('POST', '/api/webhooks/stripe');
    const webhookRetryDeferredCount = webhookStripeMetrics.filter((metric) => metric.error === 'retry_deferred').length;
    const webhookRetryExhaustedCount = webhookStripeMetrics.filter((metric) => metric.error === 'retry_exhausted').length;
    const webhookDuplicateCount = webhookStripeMetrics.filter((metric) => metric.error === 'duplicate_delivery').length;
    const webhookSuccessCount = webhookStripeMetrics.filter((metric) => metric.statusCode >= 200 && metric.statusCode < 400).length;
    const webhookErrorCount = webhookStripeMetrics.filter((metric) => metric.statusCode >= 400).length;
    const webhookP95Duration = webhookStripeMetrics.length > 0
      ? [...webhookStripeMetrics].sort((a, b) => a.duration - b.duration)[Math.floor(webhookStripeMetrics.length * 0.95)].duration
      : 0;

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
        serviceLevelObjectives: {
          oauth: {
            authorizeRequests: oauthAuthorizeMetrics.length,
            callbackRequests: oauthCallbackMetrics.length,
            callbackErrorRatePercent: oauthCallbackMetrics.length > 0
              ? Math.round((oauthCallbackMetrics.filter((metric) => metric.statusCode >= 400).length / oauthCallbackMetrics.length) * 100)
              : 0
          },
          webhookIngestion: {
            requests: webhookStripeMetrics.length,
            successCount: webhookSuccessCount,
            errorCount: webhookErrorCount,
            duplicateCount: webhookDuplicateCount,
            retryDeferredCount: webhookRetryDeferredCount,
            retryExhaustedCount: webhookRetryExhaustedCount,
            p95DurationMs: webhookP95Duration,
            targets: {
              maxErrorRatePercent: 1,
              maxP95DurationMs: 1500
            },
            actual: {
              errorRatePercent: webhookStripeMetrics.length > 0
                ? Math.round((webhookErrorCount / webhookStripeMetrics.length) * 100)
                : 0
            }
          }
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
