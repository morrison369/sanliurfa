/**
 * Place Review Analytics API
 * GET: Get review analytics and insights for place owners
 */

import type { APIRoute } from 'astro';
import {
  getPlaceReviewSummary,
  getTopReviewsForPlace
} from '../../../../lib/review-management';
import { queryOne } from '../../../../lib/postgres';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../lib/api';
import { recordRequest } from '../../../../lib/metrics';
import { logger } from '../../../../lib/logging';

export const GET: APIRoute = async ({ request, locals, params }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.id) {
      recordRequest('GET', '/api/places/[id]/review-analytics', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(ErrorCode.AUTH_REQUIRED, 'Authentication required', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const { id: placeId } = params;
    if (!placeId) {
      recordRequest('GET', '/api/places/[id]/review-analytics', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(ErrorCode.VALIDATION_ERROR, 'Place ID required', HttpStatus.BAD_REQUEST, undefined, requestId);
    }

    // Verify ownership
    const place = await queryOne('SELECT user_id FROM places WHERE id = $1', [placeId]);
    if (!place || place.user_id !== locals.user.id) {
      recordRequest('GET', '/api/places/[id]/review-analytics', HttpStatus.FORBIDDEN, Date.now() - startTime);
      return apiError(ErrorCode.FORBIDDEN, 'Access denied', HttpStatus.FORBIDDEN, undefined, requestId);
    }

    const summary = await getPlaceReviewSummary(placeId);
    const topReviews = await getTopReviewsForPlace(placeId, 10);

    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/places/[id]/review-analytics', HttpStatus.OK, duration);

    return apiResponse(
      {
        success: true,
        data: {
          summary,
          top_reviews: topReviews
        }
      },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/places/[id]/review-analytics', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Get review analytics failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to get analytics',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
