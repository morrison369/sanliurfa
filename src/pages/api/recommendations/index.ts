/**
 * Recommendations API
 * Personalized recommendations for users
 */

import type { APIRoute } from 'astro';
import { getUserRecommendations, generateUserRecommendations, trackUserInterest } from '../../../lib/feed/trending-recommendations';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId, safeIntParam } from '../../../lib/api';
import { recordRequest } from '../../../lib/metrics';
import { logger } from '../../../lib/logging';

export const GET: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId(request);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.id) {
      recordRequest('GET', '/api/recommendations', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(
        ErrorCode.UNAUTHORIZED,
        'Authentication required',
        HttpStatus.UNAUTHORIZED,
        undefined,
        requestId
      );
    }

    const url = new URL(request.url);
    const limit = safeIntParam(url.searchParams.get('limit'), 20, 1, 100);
    const refresh = url.searchParams.get('refresh') === 'true';
    const userId = locals.user.id;

    // Check cache first (unless refresh requested)
    const recommendations = refresh
      ? await generateUserRecommendations(userId, limit)
      : await (async () => {
          const cached = await getUserRecommendations(userId, limit);
          if (cached.length > 0) {
            return cached;
          }
          return generateUserRecommendations(userId, limit);
        })();

    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/recommendations', HttpStatus.OK, duration);

    return apiResponse(
      {
        success: true,
        data: recommendations,
        count: recommendations.length
      },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/recommendations', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error(
      'Failed to get recommendations',
      error instanceof Error ? error : new Error(String(error))
    );
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to get recommendations',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};

export const POST: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId(request);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.id) {
      recordRequest('POST', '/api/recommendations', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(
        ErrorCode.UNAUTHORIZED,
        'Authentication required',
        HttpStatus.UNAUTHORIZED,
        undefined,
        requestId
      );
    }

    const body = await request.json();
    const { category, action } = body;
    const userId = locals.user.id;

    if (!category || !action) {
      recordRequest('POST', '/api/recommendations', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'category and action required',
        HttpStatus.BAD_REQUEST,
        undefined,
        requestId
      );
    }

    // Track user interest based on action
    const weight = action === 'view' ? 1 : action === 'click' ? 3 : action === 'share' ? 5 : 1;
    await trackUserInterest(userId, category, weight);

    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/recommendations', HttpStatus.OK, duration);
    logger.info('User interest tracked', { userId, category, action });

    return apiResponse(
      {
        success: true,
        message: 'Interest tracked'
      },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/recommendations', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error(
      'Failed to track interest',
      error instanceof Error ? error : new Error(String(error))
    );
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to track interest',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
