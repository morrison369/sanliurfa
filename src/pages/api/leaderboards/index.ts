/**
 * Leaderboards API
 * GET: Get leaderboards
 */

import type { APIRoute } from 'astro';
import { getLeaderboard, getUserLeaderboardRank } from '../../../lib/leaderboards';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { recordRequest } from '../../../lib/metrics';
import { logger } from '../../../lib/logging';

export const GET: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    const url = new URL(request.url);
    const leaderboardType = url.searchParams.get('type') || 'reputation';
    const period = url.searchParams.get('period') || 'all_time';
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '100'), 500);
    const userId = url.searchParams.get('userId');

    const leaderboard = await getLeaderboard(leaderboardType, limit, period);

    let userRank = null;
    if (userId) {
      userRank = await getUserLeaderboardRank(userId, leaderboardType, period);
    }

    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/leaderboards', HttpStatus.OK, duration);

    return apiResponse(
      {
        success: true,
        data: {
          leaderboard,
          leaderboardType,
          period,
          userRank,
          count: leaderboard.length
        }
      },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/leaderboards', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Get leaderboards failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Sıralamalar alınamadı',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
