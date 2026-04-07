/**
 * Monitoring Dashboard (Admin)
 */

import type { APIRoute } from 'astro';
import { getMonitoringDashboard, getCriticalAlerts, exportMonitoringData } from '../../../../lib/monitoring';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../lib/api';
import { recordRequest } from '../../../../lib/metrics';
import { logger } from '../../../../lib/logging';

export const GET: APIRoute = async ({ request, locals, url }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.isAdmin) {
      recordRequest('GET', '/api/admin/monitoring/dashboard', HttpStatus.FORBIDDEN, Date.now() - startTime);
      return apiError(ErrorCode.FORBIDDEN, 'Admin access required', HttpStatus.FORBIDDEN, undefined, requestId);
    }

    const format = url.searchParams.get('format'); // 'json' or 'export'
    const dashboard = getMonitoringDashboard();

    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/admin/monitoring/dashboard', HttpStatus.OK, duration);

    if (format === 'export') {
      const data = exportMonitoringData();
      return apiResponse(
        { success: true, data },
        HttpStatus.OK,
        requestId
      );
    }

    // Check for critical alerts
    const criticalAlerts = getCriticalAlerts();

    if (criticalAlerts.length > 0) {
      logger.warn('Critical alerts detected', { count: criticalAlerts.length });
    }

    return apiResponse(
      {
        success: true,
        data: {
          ...dashboard,
          hasCriticalAlerts: criticalAlerts.length > 0,
          criticalAlertsCount: criticalAlerts.length
        }
      },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/admin/monitoring/dashboard', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Monitoring dashboard failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Internal server error', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
