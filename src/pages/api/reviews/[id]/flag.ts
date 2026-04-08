/**
 * Review Flag API
 * POST: Flag a review for moderation
 */

import type { APIRoute } from 'astro';
import { flagReview } from '../../../../lib/review-moderation';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../lib/api';
import { recordRequest } from '../../../../lib/metrics';
import { logger } from '../../../../lib/logging';

export const POST: APIRoute = async ({ request, locals, params }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.id) {
      recordRequest('POST', '/api/reviews/[id]/flag', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(ErrorCode.AUTH_REQUIRED, 'Authentication required', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const { id: reviewId } = params;
    if (!reviewId) {
      recordRequest('POST', '/api/reviews/[id]/flag', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(ErrorCode.VALIDATION_ERROR, 'Review ID required', HttpStatus.BAD_REQUEST, undefined, requestId);
    }

    const body = await request.json();
    const { reason, description } = body;

    if (!reason) {
      recordRequest('POST', '/api/reviews/[id]/flag', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Reason required',
        HttpStatus.BAD_REQUEST,
        undefined,
        requestId
      );
    }

    // Validate reason
    const validReasons = [
      'inappropriate_content',
      'spam',
      'fake_review',
      'off_topic',
      'offensive_language',
      'misleading',
      'harassment',
      'other'
    ];

    if (!validReasons.includes(reason)) {
      recordRequest('POST', '/api/reviews/[id]/flag', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Invalid reason',
        HttpStatus.BAD_REQUEST,
        undefined,
        requestId
      );
    }

    const flag = await flagReview(reviewId, locals.user.id, reason, description);

    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/reviews/[id]/flag', HttpStatus.CREATED, duration);

    logger.info('Review flagged via API', { reviewId, reason, userId: locals.user.id });

    return apiResponse(
      {
        success: true,
        data: flag,
        message: 'Teşekkür ederiz. Yorumu inceleyeceğiz.'
      },
      HttpStatus.CREATED,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/reviews/[id]/flag', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Flag review failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to flag review',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
