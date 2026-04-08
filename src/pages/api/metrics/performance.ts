/**
 * Performance Metrics Collection
 * POST: Collect client-side performance metrics
 */

import type { APIRoute } from 'astro';
import { insert } from '../../../lib/postgres';
import { apiResponse, apiError, HttpStatus, ErrorCode } from '../../../lib/api';
import { logger } from '../../../lib/logging';

interface ClientPerformanceMetric {
  timestamp: number;
  metrics: Record<string, number | string>;
  url: string;
  userAgent: string;
  connection: string;
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body: ClientPerformanceMetric = await request.json();

    // Validate required fields
    if (!body.timestamp || !body.metrics || !body.url) {
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Gerekli alanlar eksik',
        HttpStatus.UNPROCESSABLE_ENTITY
      );
    }

    // Store performance metric
    await insert('client_performance_metrics', {
      timestamp: new Date(body.timestamp).toISOString(),
      metrics: JSON.stringify(body.metrics),
      url: body.url,
      user_agent: body.userAgent || null,
      connection_type: body.connection || null,
      ttfb: body.metrics.ttfb,
      fcp: body.metrics.fcp,
      lcp: body.metrics.lcp,
      dcl: body.metrics.dcl,
      load: body.metrics.loadEventEnd
    }).catch((error) => {
      // Table may not exist yet, log warning but don't fail
      logger.warn('Client performance metric table not available', { error: error instanceof Error ? error.message : String(error) });
    });

    return apiResponse(
      {
        success: true,
        message: 'Performance metrics received'
      },
      HttpStatus.ACCEPTED
    );
  } catch (error) {
    logger.error('Performance metrics collection failed', error instanceof Error ? error : new Error(String(error)));
    return apiResponse(
      {
        success: false,
        warning: 'Metrics not stored'
      },
      HttpStatus.ACCEPTED // Return 202 anyway to not fail client
    );
  }
};
