/**
 * Place Followers
 * GET /api/places/[id]/followers - Get list of users following a place
 */

import type { APIRoute } from 'astro';
import { getPlaceFollowers } from '../../../../lib/place-followers';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../lib/api';
import { logger } from '../../../../lib/logging';
import { recordRequest } from '../../../../lib/metrics';
import { queryOne } from '../../../../lib/postgres';

export const GET: APIRoute = async ({ request, params, url }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    const { id: placeId } = params;
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);

    // Verify place exists
    const place = await queryOne('SELECT id FROM places WHERE id = $1', [placeId]);
    if (!place) {
      recordRequest('GET', '/api/places/[id]/followers', HttpStatus.NOT_FOUND, Date.now() - startTime);
      return apiError(
        ErrorCode.NOT_FOUND,
        'Place not found',
        HttpStatus.NOT_FOUND,
        undefined,
        requestId
      );
    }

    // Get followers
    const followers = await getPlaceFollowers(placeId, limit);

    recordRequest('GET', '/api/places/[id]/followers', HttpStatus.OK, Date.now() - startTime);

    return apiResponse({
      success: true,
      followers,
      count: followers.length
    }, HttpStatus.OK, requestId);
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/places/[id]/followers', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Failed to get place followers', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to get place followers',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
