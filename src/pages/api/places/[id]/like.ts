import type { APIRoute } from 'astro';
import { likePlace, unlikePlace, hasUserLikedPlace, getPlaceLikeCount } from '../../../../lib/social/social-interactions';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../lib/api';
import { recordRequest } from '../../../../lib/metrics';
import { logger } from '../../../../lib/logging';
import { deleteCachePattern } from '../../../../lib/cache';

export const POST: APIRoute = async ({ request, locals, params }) => {
  const requestId = getRequestId(request);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.id) {
      recordRequest('POST', '/api/places/[id]/like', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(ErrorCode.UNAUTHORIZED, 'Auth required', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const { id: placeId } = params;
    if (!placeId) {
      recordRequest('POST', '/api/places/[id]/like', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(ErrorCode.VALIDATION_ERROR, 'Place ID required', HttpStatus.BAD_REQUEST, undefined, requestId);
    }

    const body = await request.json();
    const { action } = body;

    const VALID_LIKE_ACTIONS = new Set(['like', 'unlike']);
    if (action !== undefined && action !== null && (typeof action !== 'string' || !VALID_LIKE_ACTIONS.has(action))) {
      recordRequest('POST', '/api/places/[id]/like', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(ErrorCode.VALIDATION_ERROR, 'Geçersiz action (like veya unlike olmalıdır)', HttpStatus.BAD_REQUEST, undefined, requestId);
    }

    let success = false;
    if (action === 'unlike') {
      success = await unlikePlace(placeId, locals.user.id);
    } else {
      success = await likePlace(placeId, locals.user.id);
    }

    // Cache invalidation: like/unlike places:detail (like_count) cache'ini etkiler — stale data önler
    // place:{id}:* lib içinde social-interactions tarafından zaten invalidate edilir
    await deleteCachePattern('places:detail:*').catch(() => null);

    const count = await getPlaceLikeCount(placeId);
    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/places/[id]/like', HttpStatus.OK, duration);

    logger.info('Place liked/unliked', { placeId, userId: locals.user.id, action });

    return apiResponse({ success, data: { count } }, HttpStatus.OK, requestId);
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/places/[id]/like', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Like failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Failed', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};

export const GET: APIRoute = async ({ request, locals, params }) => {
  const requestId = getRequestId(request);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    const { id: placeId } = params;
    if (!placeId) {
      recordRequest('GET', '/api/places/[id]/like', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(ErrorCode.VALIDATION_ERROR, 'Place ID required', HttpStatus.BAD_REQUEST, undefined, requestId);
    }

    const count = await getPlaceLikeCount(placeId);
    const hasLiked = locals.user ? await hasUserLikedPlace(placeId, locals.user.id) : false;

    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/places/[id]/like', HttpStatus.OK, duration);

    return apiResponse({ success: true, data: { count, hasLiked } }, HttpStatus.OK, requestId);
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/places/[id]/like', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Get likes failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Failed', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
