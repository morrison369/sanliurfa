import type { APIRoute } from 'astro';
import { getSimilarPlaces } from '../../../lib/recommendations';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { recordRequest } from '../../../lib/metrics';
import { logger } from '../../../lib/logging';

export const GET: APIRoute = async ({ request, url }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    const placeId = url.searchParams.get('placeId');
    if (!placeId) {
      recordRequest('GET', '/api/discovery/similar', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(ErrorCode.VALIDATION_ERROR, 'placeId required', HttpStatus.BAD_REQUEST, undefined, requestId);
    }

    const limit = parseInt(url.searchParams.get('limit') || '5', 10);
    const similar = await getSimilarPlaces(placeId, limit);

    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/discovery/similar', HttpStatus.OK, duration);

    return apiResponse({ success: true, data: similar, count: similar.length }, HttpStatus.OK, requestId);
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/discovery/similar', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Get similar places failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Failed', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
