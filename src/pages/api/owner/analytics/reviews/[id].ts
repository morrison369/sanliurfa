/**
 * Review Analytics
 * GET /api/owner/analytics/reviews/[id] - Get review analysis
 */

import type { APIRoute } from 'astro';
import { getReviewAnalysis } from '../../../../../lib/business-analytics';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../../lib/api';
import { logger } from '../../../../../lib/logging';
import { recordRequest } from '../../../../../lib/metrics';
import { queryOne } from '../../../../../lib/postgres';

export const GET: APIRoute = async ({ request, params, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    // Auth required
    if (!locals.user) {
      recordRequest('GET', '/api/owner/analytics/reviews/[id]', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(
        ErrorCode.UNAUTHORIZED,
        'Authentication required',
        HttpStatus.UNAUTHORIZED,
        undefined,
        requestId
      );
    }

    const { id: placeId } = params;

    // Verify ownership
    const place = await queryOne(
      'SELECT id, owner_id FROM places WHERE id = $1',
      [placeId]
    );

    if (!place || place.owner_id !== locals.user.id) {
      recordRequest('GET', '/api/owner/analytics/reviews/[id]', HttpStatus.FORBIDDEN, Date.now() - startTime);
      return apiError(
        ErrorCode.FORBIDDEN,
        'Access denied',
        HttpStatus.FORBIDDEN,
        undefined,
        requestId
      );
    }

    const reviewAnalysis = await getReviewAnalysis(placeId);

    recordRequest('GET', '/api/owner/analytics/reviews/[id]', HttpStatus.OK, Date.now() - startTime);

    return apiResponse({
      success: true,
      reviewAnalysis
    }, HttpStatus.OK, requestId);
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/owner/analytics/reviews/[id]', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Failed to get review analysis', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to get review analysis',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
