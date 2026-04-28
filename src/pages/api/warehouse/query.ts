/**
 * Warehouse OLAP Query API
 * Execute multidimensional analytics queries
 */

import type { APIRoute } from 'astro';
import { queryOLAP } from '../../../lib/data/data-warehouse';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { recordRequest } from '../../../lib/metrics';
import { logger } from '../../../lib/logging';

export const POST: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId(request);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.isAdmin) {
      recordRequest('POST', '/api/warehouse/query', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(
        ErrorCode.UNAUTHORIZED,
        'Admin access required',
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

    const ALLOWED_CUBES = ['place_activity', 'user_activity', 'review_activity'];
    const ALLOWED_DIMENSIONS = ['category', 'district', 'year', 'month', 'week', 'date'];
    const ALLOWED_MEASURES = ['visit_sum', 'review_avg', 'interaction_sum', 'visit_count', 'review_count'];
    const ALLOWED_ORDER_BY = ['visit_sum', 'review_avg', 'interaction_sum', 'visit_count', 'review_count', 'year', 'month'];

    if (!ALLOWED_CUBES.includes(cube)) {
      return apiError(ErrorCode.VALIDATION_ERROR, 'Invalid cube', HttpStatus.BAD_REQUEST, undefined, requestId);
    }
    const safeDimensions = (dimensions as string[]).filter((d: string) => ALLOWED_DIMENSIONS.includes(d));
    const safeMeasures = (measures as string[]).filter((m: string) => ALLOWED_MEASURES.includes(m));
    const safeOrderBy = ALLOWED_ORDER_BY.includes(orderBy) ? orderBy : undefined;
    const limitParsed = parseInt(String(limit), 10);
    const safeLimit = Math.min(Number.isFinite(limitParsed) ? limitParsed : 100, 1000);

    const result = await queryOLAP({
      cube,
      dimensions: safeDimensions,
      measures: safeMeasures,
      filters,
      orderBy: safeOrderBy,
      limit: safeLimit
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
