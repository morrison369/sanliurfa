/**
 * Get user badges and achievements
 * GET /api/users/stats/badges?userId=...
 */

import type { APIRoute } from 'astro';
import { getUserBadges } from '../../../../lib/user/user-stats';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../lib/api';
import { logger } from '../../../../lib/logging';

export const GET: APIRoute = async ({ request }) => {
  const requestId = getRequestId(request);
  try {
    const userId = new URL(request.url).searchParams.get('userId');

    if (!userId) {
      return apiError(ErrorCode.VALIDATION_ERROR, 'User ID is required', HttpStatus.BAD_REQUEST, undefined, requestId);
    }

    const badges = await getUserBadges(userId);

    return apiResponse({ success: true, data: badges, count: badges.length }, HttpStatus.OK, requestId);
  } catch (error) {
    logger.error('Failed to get user badges', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Failed to get user badges', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
