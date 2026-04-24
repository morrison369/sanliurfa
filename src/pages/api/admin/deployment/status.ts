/**
 * Deployment Status (Admin)
 */

import type { APIRoute } from 'astro';
import { getCurrentEnvironment, getReadinessStatus, getDeploymentChecklist } from '../../../../lib/deployment';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../lib/api';
import { recordRequest } from '../../../../lib/metrics';
import { logger } from '../../../../lib/logging';

export const GET: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId(request);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.isAdmin) {
      recordRequest('GET', '/api/admin/deployment/status', HttpStatus.FORBIDDEN, Date.now() - startTime);
      return apiError(ErrorCode.FORBIDDEN, 'Admin yetkisi gerekli', HttpStatus.FORBIDDEN, undefined, requestId);
    }

    const environment = await getCurrentEnvironment();
    const readiness = await getReadinessStatus();
    const checklist = await getDeploymentChecklist();

    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/admin/deployment/status', HttpStatus.OK, duration);

    return apiResponse(
      {
        success: true,
        data: {
          environment,
          readiness,
          checklist,
          timestamp: new Date().toISOString(),
        },
      },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/admin/deployment/status', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Deployment durum kontrolü başarısız', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Sunucu hatası', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};

