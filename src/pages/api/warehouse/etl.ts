/**
 * Warehouse ETL API
 * Trigger data warehouse population
 */

import type { APIRoute } from 'astro';
import { runWarehouseETL } from '../../../lib/data-warehouse';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { recordRequest } from '../../../lib/metrics';
import { logger } from '../../../lib/logging';

export const POST: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    // Admin-only access
    if (!locals.user?.id || locals.user?.role !== 'admin') {
      recordRequest('POST', '/api/warehouse/etl', HttpStatus.FORBIDDEN, Date.now() - startTime);
      return apiError(
        ErrorCode.AUTH_REQUIRED,
        'Admin access required',
        HttpStatus.FORBIDDEN,
        undefined,
        requestId
      );
    }

    const body = await request.json().catch(() => ({}));
    const date = body.date || new Date().toISOString().split('T')[0];

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      recordRequest('POST', '/api/warehouse/etl', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Invalid date format. Use YYYY-MM-DD',
        HttpStatus.BAD_REQUEST,
        undefined,
        requestId
      );
    }

    const result = await runWarehouseETL(date);

    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/warehouse/etl', HttpStatus.OK, duration);
    logger.info('Warehouse ETL triggered', { date, ...result });

    return apiResponse(
      {
        success: true,
        data: {
          date,
          dimensions_rows: result.dimensions,
          facts_rows: result.facts,
          duration_ms: result.duration_ms,
          executed_by: locals.user.id
        },
        message: 'ETL completed'
      },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/warehouse/etl', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error(
      'ETL failed',
      error instanceof Error ? error : new Error(String(error))
    );
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'ETL execution failed',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
