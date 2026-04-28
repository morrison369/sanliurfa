/**
 * Get user statistics including activity trends
 * GET /api/users/stats?userId=...
 */

import type { APIRoute } from 'astro';
import { getUserStats, getActivityTrends } from '../../../../lib/user/user-stats';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../lib/api';
import { logger } from '../../../../lib/logging';

export const GET: APIRoute = async ({ request }) => {
  const requestId = getRequestId(request);
  try {
    const userId = new URL(request.url).searchParams.get('userId');

    if (!userId) {
      return apiError(ErrorCode.VALIDATION_ERROR, 'User ID is required', HttpStatus.BAD_REQUEST, undefined, requestId);
    }

    const stats = await getUserStats(userId);

    if (!stats) {
      return apiError(ErrorCode.NOT_FOUND, 'User not found', HttpStatus.NOT_FOUND, undefined, requestId);
    }

    const trends = await getActivityTrends(userId);

    return apiResponse({ success: true, data: { ...stats, trends } }, HttpStatus.OK, requestId);
  } catch (error) {
    logger.error('Failed to get user stats', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Failed to get user stats', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
