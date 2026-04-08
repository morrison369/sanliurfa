/**
 * API: Search Recommendations
 * GET - Personalized place recommendations
 */
import type { APIRoute } from 'astro';
import { getPersonalizedRecommendations } from '../../../lib/search-intelligence';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { recordRequest } from '../../../lib/metrics';
import { logger } from '../../../lib/logging';

export const GET: APIRoute = async ({ request, url, locals }) => {
  const requestId = getRequestId(request as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.id) {
      recordRequest('GET', '/api/search/recommendations', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(ErrorCode.UNAUTHORIZED, 'Authentication required', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const limit = Math.min(parseInt(url.searchParams.get('limit') || '10'), 50);

    const recommendations = await getPersonalizedRecommendations(locals.user.id, limit);

    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/search/recommendations', HttpStatus.OK, duration);

    return apiResponse(
      {
        success: true,
        data: recommendations,
        meta: {
          count: recommendations.length,
          personalized: true
        }
      },
      HttpStatus.OK,
      requestId
    );
  } catch (err) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/search/recommendations', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Failed to get recommendations', err instanceof Error ? err : new Error(String(err)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Internal server error', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
