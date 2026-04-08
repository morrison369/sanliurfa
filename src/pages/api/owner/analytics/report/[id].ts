/**
 * Analytics Report
 * GET /api/owner/analytics/report/[id] - Generate comprehensive analytics report
 */

import type { APIRoute } from 'astro';
import { generateAnalyticsReport } from '../../../../../lib/business-analytics';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../../lib/api';
import { logger } from '../../../../../lib/logging';
import { recordRequest } from '../../../../../lib/metrics';
import { queryOne } from '../../../../../lib/postgres';

export const GET: APIRoute = async ({ request, params, locals, url }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    // Auth required
    if (!locals.user) {
      recordRequest('GET', '/api/owner/analytics/report/[id]', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(
        ErrorCode.UNAUTHORIZED,
        'Authentication required',
        HttpStatus.UNAUTHORIZED,
        undefined,
        requestId
      );
    }

    const { id: placeId } = params;
    const startDate = url.searchParams.get('startDate') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const endDate = url.searchParams.get('endDate') || new Date().toISOString();

    // Verify ownership
    const place = await queryOne(
      'SELECT id, owner_id FROM places WHERE id = $1',
      [placeId]
    );

    if (!place || place.owner_id !== locals.user.id) {
      recordRequest('GET', '/api/owner/analytics/report/[id]', HttpStatus.FORBIDDEN, Date.now() - startTime);
      return apiError(
        ErrorCode.FORBIDDEN,
        'Access denied',
        HttpStatus.FORBIDDEN,
        undefined,
        requestId
      );
    }

    const report = await generateAnalyticsReport(placeId, startDate, endDate);

    if (!report) {
      recordRequest('GET', '/api/owner/analytics/report/[id]', HttpStatus.NOT_FOUND, Date.now() - startTime);
      return apiError(
        ErrorCode.NOT_FOUND,
        'Could not generate report',
        HttpStatus.NOT_FOUND,
        undefined,
        requestId
      );
    }

    recordRequest('GET', '/api/owner/analytics/report/[id]', HttpStatus.OK, Date.now() - startTime);

    return apiResponse({
      success: true,
      report
    }, HttpStatus.OK, requestId);
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/owner/analytics/report/[id]', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Failed to generate report', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to generate report',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
