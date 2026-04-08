/**
 * Places Trending by Followers
 * GET /api/places/trending-followers - Get most followed places
 */

import type { APIRoute } from 'astro';
import { getTrendingPlacesByFollowers } from '../../../lib/place-followers';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { logger } from '../../../lib/logging';
import { recordRequest } from '../../../lib/metrics';

export const GET: APIRoute = async ({ request, url }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);

    // Get trending places
    const places = await getTrendingPlacesByFollowers(limit);

    recordRequest('GET', '/api/places/trending-followers', HttpStatus.OK, Date.now() - startTime);

    return apiResponse({
      success: true,
      places,
      count: places.length
    }, HttpStatus.OK, requestId);
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/places/trending-followers', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Failed to get trending places', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to get trending places',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
