/**
 * Place Badges
 * GET /api/places/[id]/badges - Get place badges
 */

import type { APIRoute } from 'astro';
import { getPlaceBadges } from '../../../../lib/place-verification';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../lib/api';
import { logger } from '../../../../lib/logging';
import { recordRequest } from '../../../../lib/metrics';
import { queryOne } from '../../../../lib/postgres';
import { getCache, setCache } from '../../../../lib/cache';

export const GET: APIRoute = async ({ request, params }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    const { id: placeId } = params;

    // Check cache first
    const cacheKey = `sanliurfa:place:badges:${placeId}`;
    const cached = await getCache(cacheKey);
    if (cached) {
      recordRequest('GET', '/api/places/[id]/badges', HttpStatus.OK, Date.now() - startTime);
      return apiResponse({
        success: true,
        badges: JSON.parse(cached)
      }, HttpStatus.OK, requestId);
    }

    // Verify place exists
    const place = await queryOne('SELECT id FROM places WHERE id = $1', [placeId]);
    if (!place) {
      recordRequest('GET', '/api/places/[id]/badges', HttpStatus.NOT_FOUND, Date.now() - startTime);
      return apiError(
        ErrorCode.NOT_FOUND,
        'Place not found',
        HttpStatus.NOT_FOUND,
        undefined,
        requestId
      );
    }

    // Get badges
    const badges = await getPlaceBadges(placeId);

    recordRequest('GET', '/api/places/[id]/badges', HttpStatus.OK, Date.now() - startTime);

    return apiResponse({
      success: true,
      badges
    }, HttpStatus.OK, requestId);
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/places/[id]/badges', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Failed to get badges', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to get badges',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
