/**
 * Dashboards API
 * Create and manage custom dashboards
 */

import type { APIRoute } from 'astro';
import { createDashboard, getUserDashboards } from '../../../lib/business-analytics';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { recordRequest } from '../../../lib/metrics';
import { logger } from '../../../lib/logging';
import { validateWithSchema } from '../../../lib/validation';

const dashboardSchema = {
  name: { type: 'string' as const, required: true, minLength: 1, maxLength: 255 },
  description: { type: 'string' as const, maxLength: 500 },
  is_public: { type: 'boolean' as const },
  refresh_interval: { type: 'number' as const }
};

export const GET: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.id) {
      recordRequest('GET', '/api/dashboards', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(
        ErrorCode.AUTH_REQUIRED,
        'Authentication required',
        HttpStatus.UNAUTHORIZED,
        undefined,
        requestId
      );
    }

    const dashboards = await getUserDashboards(locals.user.id);

    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/dashboards', HttpStatus.OK, duration);

    return apiResponse(
      {
        success: true,
        data: dashboards,
        count: dashboards.length
      },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/dashboards', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error(
      'Failed to get dashboards',
      error instanceof Error ? error : new Error(String(error))
    );
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to get dashboards',
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
      recordRequest('POST', '/api/dashboards', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(
        ErrorCode.AUTH_REQUIRED,
        'Authentication required',
        HttpStatus.UNAUTHORIZED,
        undefined,
        requestId
      );
    }

    const body = await request.json();
    const validation = validateWithSchema(body, dashboardSchema);

    if (!validation.valid) {
      recordRequest('POST', '/api/dashboards', HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Invalid dashboard data',
        HttpStatus.UNPROCESSABLE_ENTITY,
        validation.errors,
        requestId
      );
    }

    const dashboard = await createDashboard(
      validation.data.name,
      locals.user.id,
      {
        description: validation.data.description,
        is_public: validation.data.is_public ?? false,
        refresh_interval: validation.data.refresh_interval ?? 300
      }
    );

    if (!dashboard) {
      recordRequest('POST', '/api/dashboards', HttpStatus.INTERNAL_SERVER_ERROR, Date.now() - startTime);
      return apiError(
        ErrorCode.INTERNAL_ERROR,
        'Failed to create dashboard',
        HttpStatus.INTERNAL_SERVER_ERROR,
        undefined,
        requestId
      );
    }

    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/dashboards', HttpStatus.CREATED, duration);
    logger.info('Dashboard created', { dashboard_id: dashboard.id, user_id: locals.user.id });

    return apiResponse(
      {
        success: true,
        data: dashboard,
        message: 'Dashboard created'
      },
      HttpStatus.CREATED,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/dashboards', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error(
      'Failed to create dashboard',
      error instanceof Error ? error : new Error(String(error))
    );
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to create dashboard',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
