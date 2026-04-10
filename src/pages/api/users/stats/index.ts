/**
 * Get user statistics including activity trends
 * GET /api/users/stats?userId=...
 */

import type { APIRoute } from 'astro';
import { getUserStats, getActivityTrends, getUserRankingPercentile } from '../../../../lib/user-stats';
import { apiResponse, apiError, HttpStatus } from '../../../../lib/api';
import { logger } from '../../../../lib/logging';

export const GET: APIRoute = async (context) => {
  try {
    const userId = new URL(context.request.url).searchParams.get('userId');

    if (!userId) {
      return apiError(context, HttpStatus.BAD_REQUEST, 'User ID is required');
    }

    const stats = await getUserStats(userId);

    if (!stats) {
      return apiError(context, HttpStatus.NOT_FOUND, 'User not found');
    }

    const trends = await getActivityTrends(userId);
    const rankingPercentile = await getUserRankingPercentile(userId);

    return apiResponse(context, HttpStatus.OK, {
      success: true,
      data: {
        ...stats,
        trends,
        rankingPercentile
      }
    });
  } catch (error) {
    logger.error('Failed to get user stats', error instanceof Error ? error : new Error(String(error)));
    return apiError(context, HttpStatus.INTERNAL_SERVER_ERROR, 'Failed to get user stats');
  }
};
