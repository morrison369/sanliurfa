/**
 * User Visit History
 * GET /api/user/visits - Get user's place visit history
 */

import type { APIRoute } from 'astro';
import { getUserVisits, getUserVisitStats, getMostVisitedPlaces } from '../../../lib/place-visits';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { logger } from '../../../lib/logging';
import { recordRequest } from '../../../lib/metrics';

export const GET: APIRoute = async ({ request, locals, url }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    // Auth required
    if (!locals.user) {
      recordRequest('GET', '/api/user/visits', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
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
    const includeStats = url.searchParams.get('includeStats') === 'true';
    const includeMostVisited = url.searchParams.get('includeMostVisited') === 'true';

    // Get visits
    const visits = await getUserVisits(userId, limit);

    // Get stats if requested
    let stats = null;
    if (includeStats) {
      stats = await getUserVisitStats(userId);
    }

    // Get most visited places if requested
    let mostVisited = null;
    if (includeMostVisited) {
      mostVisited = await getMostVisitedPlaces(userId, 5);
    }

    recordRequest('GET', '/api/user/visits', HttpStatus.OK, Date.now() - startTime);

    return apiResponse({
      success: true,
      visits,
      stats,
      mostVisited,
      count: visits.length
    }, HttpStatus.OK, requestId);
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/user/visits', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Failed to get visits', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to get visits',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
