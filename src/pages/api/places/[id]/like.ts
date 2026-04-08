import type { APIRoute } from 'astro';
import { likePlace, unlikePlace, hasUserLikedPlace, getPlaceLikeCount } from '../../../../lib/social-interactions';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../lib/api';
import { recordRequest } from '../../../../lib/metrics';
import { logger } from '../../../../lib/logging';

export const POST: APIRoute = async ({ request, locals, params }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.id) {
      recordRequest('POST', '/api/places/[id]/like', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(ErrorCode.AUTH_REQUIRED, 'Auth required', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const { id: placeId } = params;
    if (!placeId) {
      recordRequest('POST', '/api/places/[id]/like', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(ErrorCode.VALIDATION_ERROR, 'Place ID required', HttpStatus.BAD_REQUEST, undefined, requestId);
    }

    const body = await request.json();
    const { action } = body;

    let success = false;
    if (action === 'unlike') {
      success = await unlikePlace(placeId, locals.user.id);
    } else {
      success = await likePlace(placeId, locals.user.id);
    }

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
  const requestId = getRequestId({ request } as any);
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
