/**
 * Recommendations API
 * Personalized recommendations for users
 */

import type { APIRoute } from 'astro';
import { getUserRecommendations, generateUserRecommendations, trackUserInterest } from '../../../lib/trending-recommendations';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { recordRequest } from '../../../lib/metrics';
import { logger } from '../../../lib/logging';

export const GET: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.id) {
      recordRequest('GET', '/api/recommendations', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(
        ErrorCode.AUTH_REQUIRED,
        'Authentication required',
        HttpStatus.UNAUTHORIZED,
        undefined,
        requestId
      );
    }

    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);
    const refresh = url.searchParams.get('refresh') === 'true';

    // Check cache first (unless refresh requested)
    let recommendations;
    if (refresh) {
      recommendations = await generateUserRecommendations(locals.user.id, limit);
    } else {
      recommendations = await getUserRecommendations(locals.user.id, limit);

      // If no cached recommendations, generate new ones
      if (recommendations.length === 0) {
        recommendations = await generateUserRecommendations(locals.user.id, limit);
      }
    }

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
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.id) {
      recordRequest('POST', '/api/recommendations', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(
        ErrorCode.AUTH_REQUIRED,
        'Authentication required',
        HttpStatus.UNAUTHORIZED,
        undefined,
        requestId
      );
    }

    const body = await request.json();
    const { category, action } = body;

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
    await trackUserInterest(locals.user.id, category, weight);

    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/recommendations', HttpStatus.OK, duration);
    logger.info('User interest tracked', { userId: locals.user.id, category, action });

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
