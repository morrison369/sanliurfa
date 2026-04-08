import type { APIRoute } from 'astro';
import { sharePlace, getShareCount } from '../../../../lib/social-interactions';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../lib/api';
import { recordRequest } from '../../../../lib/metrics';
import { logger } from '../../../../lib/logging';

export const POST: APIRoute = async ({ request, locals, params }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.id) {
      recordRequest('POST', '/api/places/[id]/share', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(ErrorCode.AUTH_REQUIRED, 'Auth required', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const { id: placeId } = params;
    if (!placeId) {
      recordRequest('POST', '/api/places/[id]/share', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(ErrorCode.VALIDATION_ERROR, 'Place ID required', HttpStatus.BAD_REQUEST, undefined, requestId);
    }

    const body = await request.json();
    const { platform, share_url } = body;

    const shareId = await sharePlace(placeId, locals.user.id, platform, share_url);
    const count = await getShareCount(placeId);

    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/places/[id]/share', HttpStatus.CREATED, duration);

    logger.info('Place shared', { placeId, userId: locals.user.id, platform });

    return apiResponse({ success: true, data: { shareId, count } }, HttpStatus.CREATED, requestId);
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/places/[id]/share', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Share failed', error instanceof Error ? error : new Error(String(error)));
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
      recordRequest('GET', '/api/places/[id]/share', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(ErrorCode.VALIDATION_ERROR, 'Place ID required', HttpStatus.BAD_REQUEST, undefined, requestId);
    }

    const count = await getShareCount(placeId);
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/places/[id]/share', HttpStatus.OK, duration);

    return apiResponse({ success: true, data: { count } }, HttpStatus.OK, requestId);
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/places/[id]/share', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Get shares failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Failed', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
