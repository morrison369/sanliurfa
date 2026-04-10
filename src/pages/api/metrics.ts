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
    const endpointMetrics = metrics.byEndpoint;

    const summarize = (endpoint: string) => {
      const value = endpointMetrics[endpoint];
      if (!value) {
        return {
          requests: 0,
          errorRatePercent: 0,
          avgDurationMs: 0,
          slowRatePercent: 0
        };
      }

      return {
        requests: value.count,
        errorRatePercent: value.count > 0 ? Math.round((value.errorCount / value.count) * 100) : 0,
        avgDurationMs: value.avgDuration,
        slowRatePercent: value.count > 0 ? Math.round((value.slowCount / value.count) * 100) : 0
      };
    };

    const oauthAuthorize = summarize('GET /api/auth/oauth/authorize');
    const oauthCallback = summarize('GET /api/auth/oauth/callback');
    const webhookStripe = summarize('POST /api/webhooks/stripe');

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
        focus: {
          oauth: {
            authorize: oauthAuthorize,
            callback: oauthCallback
          },
          webhooks: {
            stripe: webhookStripe
          }
        },
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
