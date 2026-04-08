/**
 * Review Helpful Vote API
 * GET: Get helpful vote counts
 * POST: Vote on review helpfulness
 */

import type { APIRoute } from 'astro';
import { voteReviewHelpful, getReviewAnalytics } from '../../../../lib/review-management';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../lib/api';
import { recordRequest } from '../../../../lib/metrics';
import { logger } from '../../../../lib/logging';

export const GET: APIRoute = async ({ request, locals, params }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    const { id: reviewId } = params;
    if (!reviewId) {
      recordRequest('GET', '/api/reviews/[id]/helpful', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(ErrorCode.VALIDATION_ERROR, 'Review ID required', HttpStatus.BAD_REQUEST, undefined, requestId);
    }

    const analytics = await getReviewAnalytics(reviewId);

    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/reviews/[id]/helpful', HttpStatus.OK, duration);

    return apiResponse(
      {
        success: true,
        data: {
          helpful_count: analytics?.helpful_count || 0,
          unhelpful_count: analytics?.unhelpful_count || 0
        }
      },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/reviews/[id]/helpful', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Get helpful count failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Failed to get helpful count', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};

export const POST: APIRoute = async ({ request, locals, params }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.id) {
      recordRequest('POST', '/api/reviews/[id]/helpful', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(ErrorCode.AUTH_REQUIRED, 'Authentication required', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const { id: reviewId } = params;
    if (!reviewId) {
      recordRequest('POST', '/api/reviews/[id]/helpful', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(ErrorCode.VALIDATION_ERROR, 'Review ID required', HttpStatus.BAD_REQUEST, undefined, requestId);
    }

    const body = await request.json();
    const { is_helpful } = body;

    if (typeof is_helpful !== 'boolean') {
      recordRequest('POST', '/api/reviews/[id]/helpful', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(ErrorCode.VALIDATION_ERROR, 'is_helpful boolean required', HttpStatus.BAD_REQUEST, undefined, requestId);
    }

    const counts = await voteReviewHelpful(reviewId, locals.user.id, is_helpful);

    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/reviews/[id]/helpful', HttpStatus.OK, duration);

    logger.info('Helpful vote recorded', { reviewId, userId: locals.user.id, isHelpful: is_helpful });

    return apiResponse(
      {
        success: true,
        data: counts
      },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/reviews/[id]/helpful', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Record helpful vote failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Failed to record vote', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
