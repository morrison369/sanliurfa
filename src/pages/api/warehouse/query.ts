/**
 * Warehouse OLAP Query API
 * Execute multidimensional analytics queries
 */

import type { APIRoute } from 'astro';
import { queryOLAP } from '../../../lib/data-warehouse';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { recordRequest } from '../../../lib/metrics';
import { logger } from '../../../lib/logging';

export const POST: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.id) {
      recordRequest('POST', '/api/warehouse/query', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(
        ErrorCode.AUTH_REQUIRED,
        'Authentication required',
        HttpStatus.UNAUTHORIZED,
        undefined,
        requestId
      );
    }

    const body = await request.json();
    const { cube, dimensions, measures, filters, orderBy, limit } = body;

    if (!cube || !dimensions || !measures) {
      recordRequest('POST', '/api/warehouse/query', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'cube, dimensions, and measures required',
        HttpStatus.BAD_REQUEST,
        undefined,
        requestId
      );
    }

    const result = await queryOLAP({
      cube,
      dimensions,
      measures,
      filters,
      orderBy,
      limit: Math.min(limit || 100, 1000)
    });

    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/warehouse/query', HttpStatus.OK, duration);

    return apiResponse(
      {
        success: true,
        data: {
          rows: result.rows,
          total: result.total,
          cached: result.cached,
          duration_ms: result.duration_ms,
          cube,
          dimensions,
          measures
        }
      },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/warehouse/query', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error(
      'OLAP query failed',
      error instanceof Error ? error : new Error(String(error))
    );
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to execute query',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
