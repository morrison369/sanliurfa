// @ts-nocheck
/**
 * Performance Optimization Recommendations (Admin)
 */

import type { APIRoute } from 'astro';
import { suggestIndexes, getQueryMetrics, getSlowQueries, CACHE_STRATEGIES } from '../../../../lib/performance-optimizer';
import { metricsCollector } from '../../../../lib/metrics';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../lib/api';
import { recordRequest } from '../../../../lib/metrics';
import { logger } from '../../../../lib/logging';

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
    const slowQueries = getSlowQueries(100); // > 100ms
    const indexSuggestions = await suggestIndexes();
    const cacheStats = {
      strategies: Object.keys(CACHE_STRATEGIES),
      strategiesCount: Object.keys(CACHE_STRATEGIES).length
    };

    const requestMetrics = metricsCollector.getAggregated();
    const slowOperations = metricsCollector.getSlowOperations(20);

    // Generate recommendations
    const recommendations: any[] = [];

    if (slowQueries.length > 5) {
      recommendations.push({
        priority: 'high',
        title: 'Yavaş Sorguları Optimize Et',
        description: `${slowQueries.length} sorgu yavaş çalışıyor (>100ms)`,
        action: 'Veritabanı indekslerini incele ve gerekli olanları ekle'
      });
    }

    if (requestMetrics.slowRequestRate > 10) {
      recommendations.push({
        priority: 'high',
        title: 'İstek Performansını İyileştir',
        description: `İsteklerin %${requestMetrics.slowRequestRate.toFixed(2)} oranı yavaş (>500ms)`,
        action: '/api/performance üzerinden yavaş endpointleri kontrol et'
      });
    }

    if (requestMetrics.cacheHitRate < 50) {
      recommendations.push({
        priority: 'medium',
        title: 'Önbellek İsabet Oranını İyileştir',
        description: `Mevcut önbellek isabet oranı %${requestMetrics.cacheHitRate.toFixed(2)} (hedef: >%60)`,
        action: 'Sık erişilen kaynaklar için TTL sürelerini uzat'
      });
    }

    recommendations.push({
      priority: 'medium',
      title: 'Veritabanı İndeksleri Ekle',
      description: `${indexSuggestions.length} indeks optimizasyon fırsatı tespit edildi`,
      action: 'Önerilen indeksleri uygula'
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
          slowOperations: slowOperations.map(op => ({
            operation: op.operation,
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
