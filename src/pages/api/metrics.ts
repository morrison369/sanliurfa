import type { APIRoute } from 'astro';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../lib/api';
import { metricsCollector } from '../../lib/metrics';
import { logger } from '../../lib/logging';

/**
 * GET /api/metrics - Get aggregated API metrics (admin only)
 */
export const GET: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  logger.setRequestId(requestId);

  // Only admin can access metrics
  if (!locals.isAdmin) {
    logger.warn('Unauthorized metrics access attempt', { userId: locals.user?.id });
    return apiError(ErrorCode.FORBIDDEN, 'Unauthorized', HttpStatus.FORBIDDEN, undefined, requestId);
  }

  try {
    const metrics = metricsCollector.getMetrics();

    logger.info('Metrics retrieved', {
      totalRequests: metrics.totalRequests,
      errorRate: metrics.errorRate,
      avgDuration: metrics.avgDuration,
      cacheHitRate: metrics.cacheHitRate
    });

    return apiResponse(
      {
        timestamp: new Date().toISOString(),
        metrics,
        thresholds: {
          slowRequestMs: 500,
          slowQueryMs: 100,
          highErrorRatePercent: 5
        }
      },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    logger.error('Failed to retrieve metrics', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Failed to retrieve metrics', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
