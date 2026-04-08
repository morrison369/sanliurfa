/**
 * User Points
 * GET /api/points - Get user's points and leaderboard
 */

import type { APIRoute } from 'astro';
import { getUserPoints, getPointsLeaderboard } from '../../../lib/points';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { logger } from '../../../lib/logging';
import { recordRequest } from '../../../lib/metrics';

export const GET: APIRoute = async ({ request, url, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    const view = url.searchParams.get('view') || 'personal'; // personal or leaderboard

    if (view === 'leaderboard') {
      // Get leaderboard
      const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);
      const leaderboard = await getPointsLeaderboard(limit);

      recordRequest('GET', '/api/points', HttpStatus.OK, Date.now() - startTime);

      return apiResponse({
        success: true,
        view: 'leaderboard',
        leaderboard,
        count: leaderboard.length
      }, HttpStatus.OK, requestId);
    } else {
      // Get personal points (requires auth)
      if (!locals.user) {
        recordRequest('GET', '/api/points', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
        return apiError(
          ErrorCode.UNAUTHORIZED,
          'Authentication required',
          HttpStatus.UNAUTHORIZED,
          undefined,
          requestId
        );
      }

      const userId = locals.user.id;
      const points = await getUserPoints(userId);

      recordRequest('GET', '/api/points', HttpStatus.OK, Date.now() - startTime);

      return apiResponse({
        success: true,
        view: 'personal',
        points: points || { userId, totalPoints: 0, lastUpdated: new Date().toISOString() }
      }, HttpStatus.OK, requestId);
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/points', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Failed to get points', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to get points',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
