/**
 * KPI Values API
 * Record and retrieve KPI values (time-series)
 */

import type { APIRoute } from 'astro';
import { recordKPIValue, getKPITrend } from '../../../../lib/business-analytics';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../lib/api';
import { recordRequest } from '../../../../lib/metrics';
import { logger } from '../../../../lib/logging';
import { validateWithSchema } from '../../../../lib/validation';

const recordValueSchema = {
  value: { type: 'number' as const, required: true },
  period_date: { type: 'string' as const, required: true, pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
  period_type: { type: 'string' as const, pattern: '^(hourly|daily|weekly|monthly)$' },
  target_value: { type: 'number' as const }
};

export const GET: APIRoute = async ({ request, locals, params }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.id) {
      recordRequest('GET', '/api/kpi/:kpiId/values', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(
        ErrorCode.AUTH_REQUIRED,
        'Authentication required',
        HttpStatus.UNAUTHORIZED,
        undefined,
        requestId
      );
    }

    const { kpiId } = params;
    const url = new URL(request.url);
    const periodType = url.searchParams.get('period') || 'daily';
    const days = parseInt(url.searchParams.get('days') || '30');

    if (!kpiId) {
      recordRequest('GET', '/api/kpi/:kpiId/values', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'KPI ID required',
        HttpStatus.BAD_REQUEST,
        undefined,
        requestId
      );
    }

    const values = await getKPITrend(kpiId, periodType, days);

    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/kpi/:kpiId/values', HttpStatus.OK, duration);

    return apiResponse(
      {
        success: true,
        data: values,
        count: values.length,
        metadata: { kpi_id: kpiId, period_type: periodType, days }
      },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/kpi/:kpiId/values', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error(
      'Failed to get KPI trend',
      error instanceof Error ? error : new Error(String(error))
    );
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to get KPI trend',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};

export const POST: APIRoute = async ({ request, locals, params }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.id) {
      recordRequest('POST', '/api/kpi/:kpiId/values', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(
        ErrorCode.AUTH_REQUIRED,
        'Authentication required',
        HttpStatus.UNAUTHORIZED,
        undefined,
        requestId
      );
    }

    const { kpiId } = params;

    if (!kpiId) {
      recordRequest('POST', '/api/kpi/:kpiId/values', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'KPI ID required',
        HttpStatus.BAD_REQUEST,
        undefined,
        requestId
      );
    }

    const body = await request.json();
    const validation = validateWithSchema(body, recordValueSchema);

    if (!validation.valid) {
      recordRequest('POST', '/api/kpi/:kpiId/values', HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Invalid value data',
        HttpStatus.UNPROCESSABLE_ENTITY,
        validation.errors,
        requestId
      );
    }

    const kpiValue = await recordKPIValue(
      kpiId,
      validation.data.value,
      validation.data.period_date,
      validation.data.period_type || 'daily',
      validation.data.target_value
    );

    if (!kpiValue) {
      recordRequest('POST', '/api/kpi/:kpiId/values', HttpStatus.INTERNAL_SERVER_ERROR, Date.now() - startTime);
      return apiError(
        ErrorCode.INTERNAL_ERROR,
        'Failed to record KPI value',
        HttpStatus.INTERNAL_SERVER_ERROR,
        undefined,
        requestId
      );
    }

    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/kpi/:kpiId/values', HttpStatus.CREATED, duration);
    logger.info('KPI value recorded', { kpi_id: kpiId, value: validation.data.value });

    return apiResponse(
      {
        success: true,
        data: kpiValue,
        message: 'KPI value recorded'
      },
      HttpStatus.CREATED,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/kpi/:kpiId/values', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error(
      'Failed to record KPI value',
      error instanceof Error ? error : new Error(String(error))
    );
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to record KPI value',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
