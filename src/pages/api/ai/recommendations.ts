import type { APIRoute } from 'astro';
import { getPersonalizedRecommendations, recordRecommendationFeedback } from '../../../lib/ai/recommendations';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId, safeIntParam } from '../../../lib/api';
import { recordRequest } from '../../../lib/metrics';
import { logger } from '../../../lib/logging';

export const GET: APIRoute = async ({ request, locals, url }) => {
  const requestId = getRequestId(request);
  const startTime = Date.now();

  try {
    if (!locals.user) {
      recordRequest('GET', '/api/ai/recommendations', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(ErrorCode.UNAUTHORIZED, 'Kimlik doğrulama gerekli', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const type = url.searchParams.get('type') as 'place' | 'blog' | 'event' | 'all' || 'all';
    const limit = safeIntParam(url.searchParams.get('limit'), 10, 1, 50);

    const recommendations = await getPersonalizedRecommendations(locals.user.id, {
      type,
      limit,
      excludeVisited: true,
    });

    recordRequest('GET', '/api/ai/recommendations', HttpStatus.OK, Date.now() - startTime);
    return apiResponse({ recommendations, count: recommendations.length }, HttpStatus.OK, requestId);

  } catch (error) {
    recordRequest('GET', '/api/ai/recommendations', HttpStatus.INTERNAL_SERVER_ERROR, Date.now() - startTime);
    logger.error('Recommendations error', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Sunucu hatası', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};

export const POST: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId(request);
  const startTime = Date.now();

  try {
    if (!locals.user) {
      recordRequest('POST', '/api/ai/recommendations', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(ErrorCode.UNAUTHORIZED, 'Kimlik doğrulama gerekli', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const body = await request.json();
    const { recommendation, feedback } = body;

    if (!recommendation || !feedback) {
      recordRequest('POST', '/api/ai/recommendations', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(ErrorCode.VALIDATION_ERROR, 'recommendation ve feedback alanları gerekli', HttpStatus.BAD_REQUEST, undefined, requestId);
    }

    await recordRecommendationFeedback(locals.user.id, recommendation, feedback);

    recordRequest('POST', '/api/ai/recommendations', HttpStatus.OK, Date.now() - startTime);
    return apiResponse({ success: true }, HttpStatus.OK, requestId);

  } catch (error) {
    recordRequest('POST', '/api/ai/recommendations', HttpStatus.INTERNAL_SERVER_ERROR, Date.now() - startTime);
    logger.error('Recommendation feedback error', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Sunucu hatası', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
