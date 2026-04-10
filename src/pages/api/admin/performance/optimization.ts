/**
 * Performance Optimization Recommendations (Admin)
 */

import type { APIRoute } from 'astro';
import { suggestIndexes, getSlowQueries, CACHE_STRATEGIES } from '../../../../lib/performance-optimizer';
import { metricsCollector } from '../../../../lib/metrics';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../lib/api';
import { recordRequest } from '../../../../lib/metrics';
import { logger } from '../../../../lib/logging';
import { getArtifactHealthSnapshot, summarizeArtifactHealth } from '../../../../lib/artifact-health';

export const GET: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.isAdmin) {
      recordRequest('GET', '/api/admin/performance/optimization', HttpStatus.FORBIDDEN, Date.now() - startTime);
      return apiError(ErrorCode.FORBIDDEN, 'Admin access required', HttpStatus.FORBIDDEN, undefined, requestId);
    }

    // Collect performance data
    const [artifactHealth, indexSuggestions] = await Promise.all([
      getArtifactHealthSnapshot(),
      suggestIndexes()
    ]);
    const artifactHealthSummary = summarizeArtifactHealth(artifactHealth);
    const slowQueries = getSlowQueries(100); // > 100ms
    const cacheStats = {
      strategies: Object.keys(CACHE_STRATEGIES),
      strategiesCount: Object.keys(CACHE_STRATEGIES).length
    };

    const requestMetrics = metricsCollector.getMetrics();
    const slowOperations = metricsCollector.getSlowOperations(20);

    // Generate recommendations
    const recommendations: any[] = [];

    if (slowQueries.length > 5) {
      recommendations.push({
        priority: 'high',
        title: 'Optimize Slow Queries',
        description: `${slowQueries.length} queries are running slowly (>100ms)`,
        action: 'Review and add database indexes'
      });
    }

    if (requestMetrics.slowRequestRate > 10) {
      recommendations.push({
        priority: 'high',
        title: 'Improve Request Performance',
        description: `${requestMetrics.slowRequestRate.toFixed(2)}% of requests are slow (>500ms)`,
        action: 'Check slow endpoints in /api/performance'
      });
    }

    if (requestMetrics.cacheHitRate < 50) {
      recommendations.push({
        priority: 'medium',
        title: 'Improve Cache Hit Rate',
        description: `Current cache hit rate is ${requestMetrics.cacheHitRate.toFixed(2)}% (target: >60%)`,
        action: 'Extend TTL for frequently accessed resources'
      });
    }

    recommendations.push({
      priority: 'medium',
      title: 'Add Database Indexes',
      description: `${indexSuggestions.length} index optimization opportunities identified`,
      action: 'Execute suggested indexes'
    });

    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/admin/performance/optimization', HttpStatus.OK, duration);
    logger.info('Performance optimization data retrieved', { slowQueries: slowQueries.length, duration });

    return apiResponse(
      {
        success: true,
        data: {
          recommendations,
          metrics: {
            slowQueriesCount: slowQueries.length,
            slowRequestRate: requestMetrics.slowRequestRate,
            cacheHitRate: requestMetrics.cacheHitRate,
            avgRequestDuration: requestMetrics.avgDuration,
            p95Duration: requestMetrics.p95Duration
          },
          cacheStrategies: cacheStats,
          indexSuggestions: indexSuggestions.slice(0, 5),
          artifactHealth,
          artifactHealthSummary,
          slowOperations: slowOperations.map(op => ({
            type: op.type,
            message: op.message,
            duration: op.duration,
            timestamp: op.timestamp
          })),
          timestamp: new Date().toISOString()
        }
      },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/admin/performance/optimization', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Performance optimization failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Internal server error', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
