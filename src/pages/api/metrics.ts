import type { APIRoute } from 'astro';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../lib/api';
import { metricsCollector } from '../../lib/metrics';
import { logger } from '../../lib/logging';
import { getCache, setCache } from '../../lib/cache';

interface FocusSnapshot {
  timestamp: string;
  totalRequests: number;
  errorRatePercent: number;
  avgDurationMs: number;
  p95DurationMs: number;
  oauthAuthorizeErrorRatePercent: number;
  oauthCallbackErrorRatePercent: number;
  webhookErrorRatePercent: number;
  webhookP95DurationMs: number;
  webhookDuplicateCount: number;
  webhookRetryDeferredCount: number;
  webhookRetryExhaustedCount: number;
}

const METRICS_SNAPSHOT_KEY = 'ops:metrics:focus-snapshot:latest';

function toPercent(numerator: number, denominator: number): number {
  if (denominator <= 0) {
    return 0;
  }

  return Math.round((numerator / denominator) * 100);
}

function toDelta(current: number, previous: number): number {
  return Number((current - previous).toFixed(2));
}

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
    const webhookStripeMetrics = metricsCollector.getEndpointMetrics('POST', '/api/webhooks/stripe');
    const sortedWebhookByDuration = [...webhookStripeMetrics].sort((a, b) => a.duration - b.duration);
    const webhookP95DurationMs = sortedWebhookByDuration.length > 0
      ? sortedWebhookByDuration[Math.floor(sortedWebhookByDuration.length * 0.95)]?.duration ?? 0
      : 0;
    const webhookDuplicateCount = webhookStripeMetrics.filter((metric) => metric.error === 'duplicate_delivery').length;
    const webhookRetryDeferredCount = webhookStripeMetrics.filter((metric) => metric.error === 'retry_deferred').length;
    const webhookRetryExhaustedCount = webhookStripeMetrics.filter((metric) => metric.error === 'retry_exhausted').length;

    const currentSnapshot: FocusSnapshot = {
      timestamp: new Date().toISOString(),
      totalRequests: metrics.totalRequests,
      errorRatePercent: metrics.errorRate,
      avgDurationMs: metrics.avgDuration,
      p95DurationMs: metrics.p95Duration,
      oauthAuthorizeErrorRatePercent: oauthAuthorize.errorRatePercent,
      oauthCallbackErrorRatePercent: oauthCallback.errorRatePercent,
      webhookErrorRatePercent: webhookStripe.errorRatePercent,
      webhookP95DurationMs,
      webhookDuplicateCount,
      webhookRetryDeferredCount,
      webhookRetryExhaustedCount
    };

    const previousSnapshot = await getCache<FocusSnapshot>(METRICS_SNAPSHOT_KEY);
    await setCache(METRICS_SNAPSHOT_KEY, currentSnapshot, 60 * 60 * 24);

    const trend = previousSnapshot
      ? {
          window: `${previousSnapshot.timestamp} -> ${currentSnapshot.timestamp}`,
          totalRequestsDelta: currentSnapshot.totalRequests - previousSnapshot.totalRequests,
          errorRatePercentDelta: toDelta(currentSnapshot.errorRatePercent, previousSnapshot.errorRatePercent),
          avgDurationMsDelta: toDelta(currentSnapshot.avgDurationMs, previousSnapshot.avgDurationMs),
          p95DurationMsDelta: toDelta(currentSnapshot.p95DurationMs, previousSnapshot.p95DurationMs),
          oauthCallbackErrorRatePercentDelta: toDelta(
            currentSnapshot.oauthCallbackErrorRatePercent,
            previousSnapshot.oauthCallbackErrorRatePercent
          ),
          webhookErrorRatePercentDelta: toDelta(
            currentSnapshot.webhookErrorRatePercent,
            previousSnapshot.webhookErrorRatePercent
          ),
          webhookP95DurationMsDelta: toDelta(currentSnapshot.webhookP95DurationMs, previousSnapshot.webhookP95DurationMs),
          webhookDuplicateCountDelta: currentSnapshot.webhookDuplicateCount - previousSnapshot.webhookDuplicateCount
        }
      : null;

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
            stripe: {
              ...webhookStripe,
              p95DurationMs: webhookP95DurationMs,
              duplicateCount: webhookDuplicateCount,
              retryDeferredCount: webhookRetryDeferredCount,
              retryExhaustedCount: webhookRetryExhaustedCount,
              duplicateRatePercent: toPercent(webhookDuplicateCount, webhookStripeMetrics.length)
            }
          }
        },
        snapshots: {
          current: currentSnapshot,
          previous: previousSnapshot,
          trend
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
