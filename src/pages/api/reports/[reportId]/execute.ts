/**
 * Report Execution API
 * Run and execute reports
 */

import type { APIRoute } from 'astro';
import { executeReport } from '../../../../lib/report-engine';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../lib/api';
import { recordRequest } from '../../../../lib/metrics';
import { logger } from '../../../../lib/logging';

export const POST: APIRoute = async ({ request, locals, params }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.id) {
      recordRequest('POST', '/api/reports/:reportId/execute', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(
        ErrorCode.AUTH_REQUIRED,
        'Authentication required',
        HttpStatus.UNAUTHORIZED,
        undefined,
        requestId
      );
    }

    const { reportId } = params;

    if (!reportId) {
      recordRequest('POST', '/api/reports/:reportId/execute', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Report ID required',
        HttpStatus.BAD_REQUEST,
        undefined,
        requestId
      );
    }

    const body = await request.json().catch(() => ({}));
    const format = (body.format || 'csv') as 'csv' | 'json' | 'excel';

    const result = await executeReport(reportId, format);

    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/reports/:reportId/execute', HttpStatus.OK, duration);

    return apiResponse(
      {
        success: true,
        data: {
          report_id: reportId,
          format: format,
          filename: result.filename,
          row_count: result.rowCount,
          content_type: result.contentType
        },
        message: 'Report executed'
      },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/reports/:reportId/execute', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error(
      'Failed to execute report',
      error instanceof Error ? error : new Error(String(error))
    );
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to execute report',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
