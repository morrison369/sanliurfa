/**
 * Warehouse Dimensions API
 * Get available dimensions and measures for OLAP
 */

import type { APIRoute } from 'astro';
import { getAvailableDimensions, getAvailableMeasures } from '../../../lib/data-warehouse';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { recordRequest } from '../../../lib/metrics';
import { logger } from '../../../lib/logging';

export const GET: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.id) {
      recordRequest('GET', '/api/warehouse/dimensions', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(
        ErrorCode.AUTH_REQUIRED,
        'Authentication required',
        HttpStatus.UNAUTHORIZED,
        undefined,
        requestId
      );
    }

    const dimensions = getAvailableDimensions();
    const measures = getAvailableMeasures();

    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/warehouse/dimensions', HttpStatus.OK, duration);

    return apiResponse(
      {
        success: true,
        data: {
          dimensions,
          measures,
          cubes: ['place_activity', 'business_metrics', 'kpi_trend'],
          description: 'Available dimensions and measures for OLAP queries'
        }
      },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/warehouse/dimensions', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error(
      'Failed to get dimensions',
      error instanceof Error ? error : new Error(String(error))
    );
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to get dimensions',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
