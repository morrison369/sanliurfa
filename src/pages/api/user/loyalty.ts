/**
 * User Loyalty API
 * GET: Get user's loyalty balance, tiers, and stats
 */

import type { APIRoute } from 'astro';
import {
  getLoyaltyBalance,
  getAllLoyaltyTiers,
  getTransactionHistory
} from '../../../lib/loyalty-system';
import { getAchievementStats, getUserAchievements } from '../../../lib/achievements';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { recordRequest } from '../../../lib/metrics';
import { logger } from '../../../lib/logging';

export const GET: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.id) {
      recordRequest('GET', '/api/user/loyalty', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(ErrorCode.AUTH_REQUIRED, 'Authentication required', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const url = new URL(request.url);
    const section = url.searchParams.get('section') || 'summary';

    let data: any = {};

    if (section === 'summary' || section === 'all') {
      const balance = await getLoyaltyBalance(locals.user.id);
      const tiers = await getAllLoyaltyTiers();
      const achievements = await getAchievementStats(locals.user.id);

      data.balance = balance;
      data.tiers = tiers;
      data.achievements = achievements;
    }

    if (section === 'transactions' || section === 'all') {
      const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);
      const offset = parseInt(url.searchParams.get('offset') || '0');
      const transactions = await getTransactionHistory(locals.user.id, limit, offset);
      data.transactions = transactions;
    }

    if (section === 'achievements' || section === 'all') {
      const achievements = await getUserAchievements(locals.user.id);
      data.user_achievements = achievements;
    }

    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/user/loyalty', HttpStatus.OK, duration);

    return apiResponse(
      { success: true, data },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/user/loyalty', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Get loyalty failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to get loyalty information',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
