/**
 * Business Metrics API
 * Track and retrieve business metrics
 */

import type { APIRoute } from 'astro';
import { recordBusinessMetrics, getBusinessMetrics } from '../../../lib/business-analytics';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { recordRequest } from '../../../lib/metrics';
import { logger } from '../../../lib/logging';
import { validateWithSchema } from '../../../lib/validation';

const metricsSchema = {
  metric_date: { type: 'string' as const, required: true, pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
  revenue: { type: 'number' as const },
  user_count: { type: 'number' as const },
  active_users: { type: 'number' as const },
  new_users: { type: 'number' as const },
  engagement_rate: { type: 'number' as const, min: 0, max: 100 },
  churn_rate: { type: 'number' as const, min: 0, max: 100 },
  retention_rate: { type: 'number' as const, min: 0, max: 100 },
  conversion_rate: { type: 'number' as const, min: 0, max: 100 },
  avg_session_duration: { type: 'number' as const },
  page_views: { type: 'number' as const },
  bounce_rate: { type: 'number' as const, min: 0, max: 100 }
};

export const GET: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.id) {
      recordRequest('GET', '/api/business-metrics', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(
        ErrorCode.AUTH_REQUIRED,
        'Authentication required',
        HttpStatus.UNAUTHORIZED,
        undefined,
        requestId
      );
    }

    const url = new URL(request.url);
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');

    if (!startDate || !endDate) {
      recordRequest('GET', '/api/business-metrics', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'startDate and endDate required',
        HttpStatus.BAD_REQUEST,
        undefined,
        requestId
      );
    }

    const metrics = await getBusinessMetrics(startDate, endDate);

    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/business-metrics', HttpStatus.OK, duration);

    return apiResponse(
      {
        success: true,
        data: metrics,
        count: metrics.length,
        metadata: { startDate, endDate }
      },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/business-metrics', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error(
      'Failed to get business metrics',
      error instanceof Error ? error : new Error(String(error))
    );
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to get business metrics',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};

export const POST: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.id) {
      recordRequest('POST', '/api/business-metrics', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(
        ErrorCode.AUTH_REQUIRED,
        'Authentication required',
        HttpStatus.UNAUTHORIZED,
        undefined,
        requestId
      );
    }

    const body = await request.json();
    const validation = validateWithSchema(body, metricsSchema);

    if (!validation.valid) {
      recordRequest('POST', '/api/business-metrics', HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Invalid metrics data',
        HttpStatus.UNPROCESSABLE_ENTITY,
        validation.errors,
        requestId
      );
    }

    const metrics = await recordBusinessMetrics(validation.data.metric_date, validation.data);

    if (!metrics) {
      recordRequest('POST', '/api/business-metrics', HttpStatus.INTERNAL_SERVER_ERROR, Date.now() - startTime);
      return apiError(
        ErrorCode.INTERNAL_ERROR,
        'Failed to record metrics',
        HttpStatus.INTERNAL_SERVER_ERROR,
        undefined,
        requestId
      );
    }

    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/business-metrics', HttpStatus.CREATED, duration);
    logger.info('Business metrics recorded', { metric_date: validation.data.metric_date, user_id: locals.user.id });

    return apiResponse(
      {
        success: true,
        data: metrics,
        message: 'Metrics recorded'
      },
      HttpStatus.CREATED,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/business-metrics', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error(
      'Failed to record metrics',
      error instanceof Error ? error : new Error(String(error))
    );
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to record metrics',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
