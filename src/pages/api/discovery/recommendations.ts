import type { APIRoute } from 'astro';
import { getRecommendationsForUser, recordRecommendationClick, generateRecommendations } from '../../../lib/recommendations';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { recordRequest } from '../../../lib/metrics';
import { logger } from '../../../lib/logging';

export const GET: APIRoute = async ({ request, locals, url }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.id) {
      recordRequest('GET', '/api/discovery/recommendations', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(ErrorCode.AUTH_REQUIRED, 'Auth required', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const limit = parseInt(url.searchParams.get('limit') || '10', 10);
    const recs = await getRecommendationsForUser(locals.user.id, limit);

    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/discovery/recommendations', HttpStatus.OK, duration);

    return apiResponse({ success: true, data: recs, count: recs.length }, HttpStatus.OK, requestId);
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/discovery/recommendations', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Get recommendations failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Failed', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};

export const POST: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.id) {
      recordRequest('POST', '/api/discovery/recommendations', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(ErrorCode.AUTH_REQUIRED, 'Auth required', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const body = await request.json();
    const { action, recommendation_id } = body;

    if (action === 'click' && recommendation_id) {
      await recordRecommendationClick(recommendation_id);
    } else if (action === 'generate') {
      await generateRecommendations(locals.user.id);
    }

    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/discovery/recommendations', HttpStatus.OK, duration);

    return apiResponse({ success: true }, HttpStatus.OK, requestId);
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/discovery/recommendations', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Recommendation action failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Failed', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
