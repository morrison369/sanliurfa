/**
 * Dashboard Widgets API
 * Add and manage widgets on dashboards
 */

import type { APIRoute } from 'astro';
import { addDashboardWidget } from '../../../../lib/business-analytics';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../lib/api';
import { recordRequest } from '../../../../lib/metrics';
import { logger } from '../../../../lib/logging';
import { validateWithSchema } from '../../../../lib/validation';

const widgetSchema = {
  widget_type: { type: 'string' as const, required: true, minLength: 1, maxLength: 50 },
  kpi_id: { type: 'string' as const },
  position_x: { type: 'number' as const, min: 0 },
  position_y: { type: 'number' as const, min: 0 },
  width: { type: 'number' as const, min: 1 },
  height: { type: 'number' as const, min: 1 }
};

export const POST: APIRoute = async ({ request, locals, params }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.id) {
      recordRequest('POST', '/api/dashboards/:dashboardId/widgets', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(
        ErrorCode.AUTH_REQUIRED,
        'Authentication required',
        HttpStatus.UNAUTHORIZED,
        undefined,
        requestId
      );
    }

    const { dashboardId } = params;

    if (!dashboardId) {
      recordRequest('POST', '/api/dashboards/:dashboardId/widgets', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Dashboard ID required',
        HttpStatus.BAD_REQUEST,
        undefined,
        requestId
      );
    }

    const body = await request.json();
    const validation = validateWithSchema(body, widgetSchema);

    if (!validation.valid) {
      recordRequest('POST', '/api/dashboards/:dashboardId/widgets', HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Invalid widget data',
        HttpStatus.UNPROCESSABLE_ENTITY,
        validation.errors,
        requestId
      );
    }

    const widget = await addDashboardWidget(dashboardId, validation.data.widget_type, {
      kpi_id: validation.data.kpi_id,
      position_x: validation.data.position_x ?? 0,
      position_y: validation.data.position_y ?? 0,
      width: validation.data.width ?? 4,
      height: validation.data.height ?? 3
    });

    if (!widget) {
      recordRequest('POST', '/api/dashboards/:dashboardId/widgets', HttpStatus.INTERNAL_SERVER_ERROR, Date.now() - startTime);
      return apiError(
        ErrorCode.INTERNAL_ERROR,
        'Failed to add widget',
        HttpStatus.INTERNAL_SERVER_ERROR,
        undefined,
        requestId
      );
    }

    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/dashboards/:dashboardId/widgets', HttpStatus.CREATED, duration);
    logger.info('Dashboard widget added', { dashboard_id: dashboardId, widget_id: widget.id });

    return apiResponse(
      {
        success: true,
        data: widget,
        message: 'Widget added to dashboard'
      },
      HttpStatus.CREATED,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/dashboards/:dashboardId/widgets', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error(
      'Failed to add dashboard widget',
      error instanceof Error ? error : new Error(String(error))
    );
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to add widget',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
