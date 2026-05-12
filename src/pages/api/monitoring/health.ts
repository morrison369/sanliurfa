/**
 * Health Check Endpoint
 */

import type { APIRoute } from 'astro';
import { performHealthCheck } from '../../../lib/monitoring';
import { apiResponse, HttpStatus, getRequestId, safeErrorDetail } from '../../../lib/api';
import { recordRequest } from '../../../lib/metrics';

export const GET: APIRoute = async ({ request }) => {
  const requestId = getRequestId(request);
  const startTime = Date.now();

  try {
    const health = await performHealthCheck();

    const duration = Date.now() - startTime;
    const httpStatus = health.status === 'healthy' ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE;
    recordRequest('GET', '/api/monitoring/health', httpStatus, duration);

    return apiResponse(
      {
        success: true,
        data: {
          ...health,
          checks: health.services,
        }
      },
      httpStatus,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/monitoring/health', HttpStatus.INTERNAL_SERVER_ERROR, duration);

    return apiResponse(
      {
        success: false,
        data: {
          status: 'down',
          error: safeErrorDetail(error, 'Sağlık durumu alınamadı'),
          timestamp: new Date().toISOString()
        }
      },
      HttpStatus.SERVICE_UNAVAILABLE,
      requestId
    );
  }
};

