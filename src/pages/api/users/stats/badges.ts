/**
 * Get user badges and achievements
 * GET /api/users/stats/badges?userId=...
 */

import type { APIRoute } from 'astro';
import { getUserBadges } from '../../../../lib/user/user-stats';
import { apiResponse, apiError, HttpStatus } from '../../../../lib/api';
import { logger } from '../../../../lib/logging';

export const GET: APIRoute = async (context) => {
  try {
    const userId = new URL(context.request.url).searchParams.get('userId');

    if (!userId) {
      return apiError(context, HttpStatus.BAD_REQUEST, 'User ID is required');
    }

    const badges = await getUserBadges(userId);

    return apiResponse({ success: true, data: badges, count: badges.length }, HttpStatus.OK);
  } catch (error) {
    logger.error('Failed to get user badges', error instanceof Error ? error : new Error(String(error)));
    return apiError(context, HttpStatus.INTERNAL_SERVER_ERROR, 'Failed to get user badges');
  }
};
