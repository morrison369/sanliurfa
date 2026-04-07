/**
 * Health Check Endpoint
 */

import type { APIRoute } from 'astro';
import { performHealthCheck } from '../../../lib/monitoring';
import { apiResponse, HttpStatus, getRequestId } from '../../../lib/api';
import { recordRequest } from '../../../lib/metrics';

export const GET: APIRoute = async ({ request }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();

  try {
    const checks = await performHealthCheck();

    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/monitoring/health', HttpStatus.OK, duration);

    const allHealthy = checks.every(c => c.status === 'healthy');

    return apiResponse(
      {
        success: true,
        data: {
          status: allHealthy ? 'healthy' : 'degraded',
          checks,
          timestamp: new Date().toISOString()
        }
      },
      allHealthy ? HttpStatus.OK : 503,
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
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString()
        }
      },
      HttpStatus.SERVICE_UNAVAILABLE,
      requestId
    );
  }
};
