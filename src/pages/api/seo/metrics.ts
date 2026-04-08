/**
 * SEO Metrics API
 * Core Web Vitals, page performance, crawlability metrics
 */

import type { APIRoute } from 'astro';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { recordRequest } from '../../../lib/metrics';
import { logger } from '../../../lib/logging';

export interface CoreWebVitalMetric {
  name: 'LCP' | 'FID' | 'CLS';
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
}

export interface SeoMetric {
  timestamp: string;
  url: string;
  vitals: CoreWebVitalMetric[];
  indexable: boolean;
  noindex: boolean;
}

// In-memory store for metrics (in production, use database)
const metricsStore: SeoMetric[] = [];

export const POST: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    const body = await request.json();
    const { url, vitals } = body;

    if (!url || !vitals || !Array.isArray(vitals)) {
      recordRequest('POST', '/api/seo/metrics', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'url and vitals array required',
        HttpStatus.BAD_REQUEST,
        undefined,
        requestId
      );
    }

    // Rate vitals
    const ratedVitals: CoreWebVitalMetric[] = vitals.map((vital: any) => {
      let rating: 'good' | 'needs-improvement' | 'poor';

      if (vital.name === 'LCP') {
        rating = vital.value <= 2500 ? 'good' : vital.value <= 4000 ? 'needs-improvement' : 'poor';
      } else if (vital.name === 'FID') {
        rating = vital.value <= 100 ? 'good' : vital.value <= 300 ? 'needs-improvement' : 'poor';
      } else if (vital.name === 'CLS') {
        rating = vital.value <= 0.1 ? 'good' : vital.value <= 0.25 ? 'needs-improvement' : 'poor';
      } else {
        rating = 'needs-improvement';
      }

      return {
        name: vital.name,
        value: vital.value,
        rating
      };
    });

    const metric: SeoMetric = {
      timestamp: new Date().toISOString(),
      url,
      vitals: ratedVitals,
      indexable: true,
      noindex: false
    };

    metricsStore.push(metric);

    // Keep only last 1000 metrics
    if (metricsStore.length > 1000) {
      metricsStore.shift();
    }

    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/seo/metrics', HttpStatus.CREATED, duration);
    logger.info('SEO metric recorded', { url, vitals: ratedVitals });

    return apiResponse(
      { success: true, data: metric },
      HttpStatus.CREATED,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/seo/metrics', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error(
      'Failed to record SEO metric',
      error instanceof Error ? error : new Error(String(error))
    );
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to record metric',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};

export const GET: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    // Check if user is admin for detailed metrics
    if (!locals.user?.id || locals.user?.role !== 'admin') {
      recordRequest('GET', '/api/seo/metrics', HttpStatus.FORBIDDEN, Date.now() - startTime);
      return apiError(
        ErrorCode.FORBIDDEN,
        'Admin access required',
        HttpStatus.FORBIDDEN,
        undefined,
        requestId
      );
    }

    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '100'), 1000);
    const pageIndex = Math.max(0, metricsStore.length - limit);

    const metrics = metricsStore.slice(pageIndex);

    // Calculate aggregates
    const totalMetrics = metricsStore.length;
    const avgVitals = calculateAverageVitals(metricsStore);
    const poorVitals = metricsStore.filter(m =>
      m.vitals.some(v => v.rating === 'poor')
    ).length;

    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/seo/metrics', HttpStatus.OK, duration);

    return apiResponse(
      {
        success: true,
        data: {
          metrics,
          summary: {
            total: totalMetrics,
            poorPercentage: totalMetrics > 0 ? (poorVitals / totalMetrics * 100).toFixed(1) : '0',
            averageVitals: avgVitals
          }
        },
        count: metrics.length
      },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/seo/metrics', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error(
      'Failed to get SEO metrics',
      error instanceof Error ? error : new Error(String(error))
    );
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to get metrics',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};

function calculateAverageVitals(metrics: SeoMetric[]): Record<string, number> {
  const vitals: Record<string, { sum: number; count: number }> = {
    LCP: { sum: 0, count: 0 },
    FID: { sum: 0, count: 0 },
    CLS: { sum: 0, count: 0 }
  };

  for (const metric of metrics) {
    for (const vital of metric.vitals) {
      if (vitals[vital.name]) {
        vitals[vital.name].sum += vital.value;
        vitals[vital.name].count += 1;
      }
    }
  }

  return Object.entries(vitals).reduce((acc, [name, { sum, count }]) => {
    acc[name] = count > 0 ? Math.round(sum / count) : 0;
    return acc;
  }, {} as Record<string, number>);
}
