/**
 * User's Followed Places
 * GET /api/user/following/places - Get places followed by authenticated user
 */

import type { APIRoute } from 'astro';
import { getUserFollowedPlaces } from '../../../../lib/place-followers';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../lib/api';
import { logger } from '../../../../lib/logging';
import { recordRequest } from '../../../../lib/metrics';

export const GET: APIRoute = async ({ request, locals, url }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    // Auth required
    if (!locals.user) {
      recordRequest('GET', '/api/user/following/places', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(
        ErrorCode.UNAUTHORIZED,
        'Authentication required',
        HttpStatus.UNAUTHORIZED,
        undefined,
        requestId
      );
    }

    const userId = locals.user.id;
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 200);

    // Get followed places
    const places = await getUserFollowedPlaces(userId, limit);

    recordRequest('GET', '/api/user/following/places', HttpStatus.OK, Date.now() - startTime);

    return apiResponse({
      success: true,
      places,
      count: places.length
    }, HttpStatus.OK, requestId);
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/user/following/places', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Failed to get followed places', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to get followed places',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
