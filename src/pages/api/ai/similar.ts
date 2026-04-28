import type { APIRoute } from 'astro';
import { getSimilarItems } from '../../../lib/ai/recommendations';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId, safeIntParam } from '../../../lib/api';
import { recordRequest } from '../../../lib/metrics';
import { logger } from '../../../lib/logging';

export const GET: APIRoute = async ({ request, url }) => {
  const requestId = getRequestId(request);
  const startTime = Date.now();

  try {
    const itemId = url.searchParams.get('id');
    const itemType = url.searchParams.get('type') as 'place' | 'blog' | 'event' || 'place';
    const limit = safeIntParam(url.searchParams.get('limit'), 5, 1, 20);

    if (!itemId) {
      recordRequest('GET', '/api/ai/similar', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(ErrorCode.VALIDATION_ERROR, 'id parametresi gerekli', HttpStatus.BAD_REQUEST, undefined, requestId);
    }

    const similar = await getSimilarItems(itemId, itemType, limit);

    recordRequest('GET', '/api/ai/similar', HttpStatus.OK, Date.now() - startTime);
    return apiResponse({ similar, count: similar.length }, HttpStatus.OK, requestId);

  } catch (error) {
    recordRequest('GET', '/api/ai/similar', HttpStatus.INTERNAL_SERVER_ERROR, Date.now() - startTime);
    logger.error('Similar items error', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Sunucu hatası', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
