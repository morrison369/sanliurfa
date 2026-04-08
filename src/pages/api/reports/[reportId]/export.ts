/**
 * Report Export API
 * Download reports in CSV/JSON/Excel format
 */

import type { APIRoute } from 'astro';
import { executeReport } from '../../../../lib/report-engine';
import { apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../lib/api';
import { recordRequest } from '../../../../lib/metrics';
import { logger } from '../../../../lib/logging';

export const GET: APIRoute = async ({ request, locals, params }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.id) {
      recordRequest('GET', '/api/reports/:reportId/export', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(
        ErrorCode.AUTH_REQUIRED,
        'Authentication required',
        HttpStatus.UNAUTHORIZED,
        undefined,
        requestId
      );
    }

    const { reportId } = params;
    const url = new URL(request.url);
    const format = (url.searchParams.get('format') || 'csv') as 'csv' | 'json' | 'excel';

    if (!reportId) {
      recordRequest('GET', '/api/reports/:reportId/export', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Report ID required',
        HttpStatus.BAD_REQUEST,
        undefined,
        requestId
      );
    }

    if (!['csv', 'json', 'excel'].includes(format)) {
      recordRequest('GET', '/api/reports/:reportId/export', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Invalid format. Must be csv, json, or excel',
        HttpStatus.BAD_REQUEST,
        undefined,
        requestId
      );
    }

    const result = await executeReport(reportId, format);

    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/reports/:reportId/export', HttpStatus.OK, duration);

    // Convert to Uint8Array if it's a Buffer
    let body: Uint8Array | string;
    if (Buffer.isBuffer(result.buffer)) {
      body = new Uint8Array(result.buffer);
    } else {
      body = result.buffer;
    }

    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': result.contentType,
        'Content-Disposition': `attachment; filename="${result.filename}"`,
        'X-Request-ID': requestId
      }
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/reports/:reportId/export', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error(
      'Failed to export report',
      error instanceof Error ? error : new Error(String(error))
    );
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to export report',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
