import type { APIRoute } from 'astro';
import { addReaction, removeReaction, getReactionCounts } from '../../../../lib/social-interactions';
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
      recordRequest('GET', '/api/reviews/[id]/reactions', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(ErrorCode.VALIDATION_ERROR, 'Review ID required', HttpStatus.BAD_REQUEST, undefined, requestId);
    }

    const counts = await getReactionCounts(reviewId);
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/reviews/[id]/reactions', HttpStatus.OK, duration);

    return apiResponse({ success: true, data: counts }, HttpStatus.OK, requestId);
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/reviews/[id]/reactions', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Get reactions failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Failed', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};

export const POST: APIRoute = async ({ request, locals, params }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.id) {
      recordRequest('POST', '/api/reviews/[id]/reactions', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(ErrorCode.AUTH_REQUIRED, 'Auth required', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const { id: reviewId } = params;
    if (!reviewId) {
      recordRequest('POST', '/api/reviews/[id]/reactions', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(ErrorCode.VALIDATION_ERROR, 'Review ID required', HttpStatus.BAD_REQUEST, undefined, requestId);
    }

    const body = await request.json();
    const { reaction_type, action } = body;

    if (!reaction_type) {
      recordRequest('POST', '/api/reviews/[id]/reactions', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(ErrorCode.VALIDATION_ERROR, 'reaction_type required', HttpStatus.BAD_REQUEST, undefined, requestId);
    }

    let success = false;
    if (action === 'remove') {
      success = await removeReaction(reviewId, locals.user.id, reaction_type);
    } else {
      success = await addReaction(reviewId, locals.user.id, reaction_type);
    }

    const counts = await getReactionCounts(reviewId);
    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/reviews/[id]/reactions', HttpStatus.OK, duration);

    logger.info('Reaction added', { reviewId, userId: locals.user.id, type: reaction_type });

    return apiResponse({ success, data: counts }, HttpStatus.OK, requestId);
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/reviews/[id]/reactions', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Add reaction failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Failed', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
