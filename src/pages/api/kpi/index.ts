/**
 * KPI Management API
 * List and define key performance indicators
 */

import type { APIRoute } from 'astro';
import { getKPIs, defineKPI } from '../../../lib/business-analytics';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { recordRequest } from '../../../lib/metrics';
import { logger } from '../../../lib/logging';
import { validateWithSchema } from '../../../lib/validation';

const kpiSchema = {
  key: { type: 'string' as const, required: true, minLength: 3, maxLength: 100 },
  name: { type: 'string' as const, required: true, minLength: 1, maxLength: 255 },
  description: { type: 'string' as const, maxLength: 500 },
  formula: { type: 'string' as const, maxLength: 500 },
  unit: { type: 'string' as const, maxLength: 50 },
  target_value: { type: 'number' as const },
  alert_threshold: { type: 'number' as const },
  category: { type: 'string' as const, maxLength: 100 }
};

export const GET: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.id) {
      recordRequest('GET', '/api/kpi', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(
        ErrorCode.AUTH_REQUIRED,
        'Authentication required',
        HttpStatus.UNAUTHORIZED,
        undefined,
        requestId
      );
    }

    const url = new URL(request.url);
    const isActive = url.searchParams.get('active') !== 'false';

    const kpis = await getKPIs(isActive);

    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/kpi', HttpStatus.OK, duration);

    return apiResponse(
      {
        success: true,
        data: kpis,
        count: kpis.length
      },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/kpi', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error(
      'Failed to get KPIs',
      error instanceof Error ? error : new Error(String(error))
    );
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to get KPIs',
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
      recordRequest('POST', '/api/kpi', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(
        ErrorCode.AUTH_REQUIRED,
        'Authentication required',
        HttpStatus.UNAUTHORIZED,
        undefined,
        requestId
      );
    }

    const body = await request.json();
    const validation = validateWithSchema(body, kpiSchema);

    if (!validation.valid) {
      recordRequest('POST', '/api/kpi', HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Invalid KPI data',
        HttpStatus.UNPROCESSABLE_ENTITY,
        validation.errors,
        requestId
      );
    }

    const kpi = await defineKPI(validation.data.key, validation.data.name, {
      description: validation.data.description,
      formula: validation.data.formula,
      unit: validation.data.unit,
      target_value: validation.data.target_value,
      alert_threshold: validation.data.alert_threshold,
      category: validation.data.category,
      owner_id: locals.user.id
    });

    if (!kpi) {
      recordRequest('POST', '/api/kpi', HttpStatus.INTERNAL_SERVER_ERROR, Date.now() - startTime);
      return apiError(
        ErrorCode.INTERNAL_ERROR,
        'Failed to create KPI',
        HttpStatus.INTERNAL_SERVER_ERROR,
        undefined,
        requestId
      );
    }

    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/kpi', HttpStatus.CREATED, duration);
    logger.info('KPI defined', { kpi_id: kpi.id, key: kpi.key });

    return apiResponse(
      {
        success: true,
        data: kpi,
        message: 'KPI defined'
      },
      HttpStatus.CREATED,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/kpi', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error(
      'Failed to define KPI',
      error instanceof Error ? error : new Error(String(error))
    );
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to define KPI',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
