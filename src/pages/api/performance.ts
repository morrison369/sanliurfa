import type { APIRoute } from 'astro';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../lib/api';
import { classifyThresholdStatus } from '../../lib/admin-status';
import { metricsCollector } from '../../lib/metrics';
import { updatePoolStatus } from '../../lib/postgres';
import { logger } from '../../lib/logging';
import { getArtifactHealthSnapshot, summarizeArtifactHealth } from '../../lib/artifact-health';

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

    const [
      artifactHealth,
      perfStats,
      metrics,
      slowQueries,
      slowOps,
      oauthAuthorizeMetrics,
      oauthCallbackMetrics,
      webhookStripeMetrics
    ] = await Promise.all([
      getArtifactHealthSnapshot(),
      Promise.resolve(metricsCollector.getPerformanceStats()),
      Promise.resolve(metricsCollector.getMetrics()),
      Promise.resolve(metricsCollector.getSlowQueries(20)),
      Promise.resolve(metricsCollector.getSlowOperations(20)),
      Promise.resolve(metricsCollector.getEndpointMetrics('GET', '/api/auth/oauth/authorize')),
      Promise.resolve(metricsCollector.getEndpointMetrics('GET', '/api/auth/oauth/callback')),
      Promise.resolve(metricsCollector.getEndpointMetrics('POST', '/api/webhooks/stripe'))
    ]);
    const artifactHealthSummary = summarizeArtifactHealth(artifactHealth);
    const webhookRetryDeferredCount = webhookStripeMetrics.filter((metric) => metric.error === 'retry_deferred').length;
    const webhookRetryExhaustedCount = webhookStripeMetrics.filter((metric) => metric.error === 'retry_exhausted').length;
    const webhookDuplicateCount = webhookStripeMetrics.filter((metric) => metric.error === 'duplicate_delivery').length;
    const webhookSuccessCount = webhookStripeMetrics.filter((metric) => metric.statusCode >= 200 && metric.statusCode < 400).length;
    const webhookErrorCount = webhookStripeMetrics.filter((metric) => metric.statusCode >= 400).length;
    const webhookErrorRatePercent = webhookStripeMetrics.length > 0
      ? Math.round((webhookErrorCount / webhookStripeMetrics.length) * 100)
      : 0;
    const oauthCallbackErrorRatePercent = oauthCallbackMetrics.length > 0
      ? Math.round((oauthCallbackMetrics.filter((metric) => metric.statusCode >= 400).length / oauthCallbackMetrics.length) * 100)
      : 0;
    const webhookP95Duration = webhookStripeMetrics.length > 0
      ? [...webhookStripeMetrics].sort((a, b) => a.duration - b.duration)[Math.floor(webhookStripeMetrics.length * 0.95)].duration
      : 0;
    const oauthStatus = classifyThresholdStatus({
      blockedWhen: oauthCallbackErrorRatePercent > 5,
      degradedWhen: oauthCallbackErrorRatePercent > 2
    });
    const webhookStatus = classifyThresholdStatus({
      blockedWhen: webhookErrorRatePercent > 3 || webhookP95Duration > 2500 || webhookRetryExhaustedCount > 0,
      degradedWhen: webhookErrorRatePercent > 1 || webhookP95Duration > 1500
    });

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
            callbackErrorRatePercent: oauthCallbackErrorRatePercent,
            status: oauthStatus
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
              errorRatePercent: webhookErrorRatePercent,
              duplicateRatePercent: webhookStripeMetrics.length > 0
                ? Math.round((webhookDuplicateCount / webhookStripeMetrics.length) * 100)
                : 0
            },
            status: webhookStatus
          }
        },
        artifactHealth,
        artifactHealthSummary,
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
