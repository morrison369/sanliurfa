/**
 * User Reputation API
 * GET: Get user reputation data
 */

import type { APIRoute } from 'astro';
import { getUserReputation, getUserReputationRank, getRepuationTier } from '../../../../lib/reputation';
import { getUserBadges, getUserBadgeCount } from '../../../../lib/badges';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../lib/api';
import { recordRequest } from '../../../../lib/metrics';
import { logger } from '../../../../lib/logging';

export const GET: APIRoute = async ({ request, params }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    const { id: userId } = params;

    const [reputation, rank, badges, badgeCount] = await Promise.all([
      getUserReputation(userId as string),
      getUserReputationRank(userId as string),
      getUserBadges(userId as string),
      getUserBadgeCount(userId as string)
    ]);

    if (!reputation) {
      recordRequest('GET', `/api/users/${userId}/reputation`, HttpStatus.NOT_FOUND, Date.now() - startTime);
      return apiError(ErrorCode.NOT_FOUND, 'Kullanıcı bulunamadı', HttpStatus.NOT_FOUND, undefined, requestId);
    }

    const tier = await getRepuationTier(reputation.totalScore);

    const duration = Date.now() - startTime;
    recordRequest('GET', `/api/users/${userId}/reputation`, HttpStatus.OK, duration);

    return apiResponse(
      {
        success: true,
        data: {
          reputation,
          rank,
          tier,
          badgeCount,
          featuredBadges: badges.filter((b: any) => b.is_featured).slice(0, 5)
        }
      },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', `/api/users/${params.id}/reputation`, HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Get reputation failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'İtibar verisi alınamadı',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
