/**
 * Monitoring Dashboard (Admin)
 */

import type { APIRoute } from 'astro';
import { getMonitoringDashboard, getCriticalAlerts, exportMonitoringData } from '../../../../lib/monitoring';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../lib/api';
import { recordRequest } from '../../../../lib/metrics';
import { logger } from '../../../../lib/logging';
import { withAdminOpsReadAccess } from '../../../../lib/admin-ops-access';

export const GET: APIRoute = async ({ request, locals, url }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    return await withAdminOpsReadAccess({
      request,
      locals,
      endpoint: '/api/admin/monitoring/dashboard',
      requestId,
      startTime,
      onDenied: (_response, statusCode, duration) => {
        recordRequest('GET', '/api/admin/monitoring/dashboard', statusCode, duration);
      },
      onSuccess: (_response, duration) => {
        recordRequest('GET', '/api/admin/monitoring/dashboard', HttpStatus.OK, duration);
      }
    }, async () => {
      const format = url.searchParams.get('format');
      const dashboard = getMonitoringDashboard();

      if (format === 'export') {
        const data = exportMonitoringData();
        return apiResponse(
          { success: true, data },
          HttpStatus.OK,
          requestId
        );
      }

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
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/admin/monitoring/dashboard', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Monitoring dashboard failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Internal server error', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
