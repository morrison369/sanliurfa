/**
 * API: Loyalty Tiers
 * GET - Tier list and user's current tier
 */
import type { APIRoute } from 'astro';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { getUserTierInfo, getTierList, getTierStats, getUserTierHistory } from '../../../lib/loyalty-tiers';
import { recordRequest } from '../../../lib/metrics';
import { logger } from '../../../lib/logging';

export const GET: APIRoute = async ({ request, url, locals }) => {
  const requestId = getRequestId(request as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    const includeHistory = url.searchParams.get('includeHistory') === 'true';
    const includeStats = url.searchParams.get('includeStats') === 'true';

    const tierList = await getTierList();
    let userTier = null;
    let history = [];
    let stats = null;

    if (locals.user?.id) {
      userTier = await getUserTierInfo(locals.user.id);

      if (includeHistory) {
        history = await getUserTierHistory(locals.user.id);
      }
    }

    if (includeStats && locals.isAdmin) {
      stats = await getTierStats();
    }

    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/loyalty/tiers', HttpStatus.OK, duration);

    return apiResponse(
      {
        success: true,
        data: {
          tiers: tierList,
          userTier,
          history: includeHistory ? history : undefined,
          stats: includeStats ? stats : undefined
        }
      },
      HttpStatus.OK,
      requestId
    );
  } catch (err) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/loyalty/tiers', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Failed to get tiers', err instanceof Error ? err : new Error(String(err)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Internal server error', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
