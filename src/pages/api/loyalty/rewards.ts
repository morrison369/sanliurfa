/**
 * API: Loyalty Rewards
 * GET - Rewards catalog
 * POST - Redeem a reward
 */
import type { APIRoute } from 'astro';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { getRewardsList, processRewardRedemption, getPromotionalOffers } from '../../../lib/rewards';
import { recordRequest } from '../../../lib/metrics';
import { logger } from '../../../lib/logging';

export const GET: APIRoute = async ({ request, url }) => {
  const requestId = getRequestId(request);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    const category = url.searchParams.get('category');
    const tier = url.searchParams.get('tier');
    const includePromos = url.searchParams.get('includePromos') === 'true';

    const VALID_REWARD_CATEGORIES = new Set(['food', 'entertainment', 'travel', 'shopping', 'experiences', 'digital', 'lifestyle']);
    const VALID_REWARD_TIERS = new Set(['bronze', 'silver', 'gold', 'platinum', 'vip']);
    if (category !== undefined && category !== null && (typeof category !== 'string' || !VALID_REWARD_CATEGORIES.has(category))) {
      recordRequest('GET', '/api/loyalty/rewards', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(ErrorCode.VALIDATION_ERROR, 'Geçersiz kategori', HttpStatus.BAD_REQUEST, undefined, requestId);
    }
    if (tier !== undefined && tier !== null && (typeof tier !== 'string' || !VALID_REWARD_TIERS.has(tier))) {
      recordRequest('GET', '/api/loyalty/rewards', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(ErrorCode.VALIDATION_ERROR, 'Geçersiz üyelik kademesi', HttpStatus.BAD_REQUEST, undefined, requestId);
    }

    const filters = {
      category: category || undefined,
      tier: tier || undefined
    };

    const rewards = await getRewardsList(filters);
    const promos = includePromos ? await getPromotionalOffers() : [];

    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/loyalty/rewards', HttpStatus.OK, duration);

    return apiResponse(
      {
        success: true,
        data: {
          rewards,
          promotionalOffers: promos
        }
      },
      HttpStatus.OK,
      requestId
    );
  } catch (err) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/loyalty/rewards', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Failed to get rewards', err instanceof Error ? err : new Error(String(err)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Internal server error', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};

export const POST: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId(request);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.id) {
      recordRequest('POST', '/api/loyalty/rewards', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(ErrorCode.UNAUTHORIZED, 'Authentication required', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const body = await request.json();
    const { rewardId } = body;

    if (!rewardId) {
      recordRequest('POST', '/api/loyalty/rewards', HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
      return apiError(ErrorCode.VALIDATION_ERROR, 'Reward ID required', HttpStatus.UNPROCESSABLE_ENTITY, undefined, requestId);
    }

    const result = await processRewardRedemption(locals.user.id, rewardId);

    if (!result.success) {
      recordRequest('POST', '/api/loyalty/rewards', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(ErrorCode.VALIDATION_ERROR, result.error || 'Redemption failed', HttpStatus.BAD_REQUEST, undefined, requestId);
    }

    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/loyalty/rewards', HttpStatus.OK, duration);
    logger.info('Reward redeemed', { userId: locals.user?.id, rewardId, redemptionCode: result.redemptionCode });

    return apiResponse(
      {
        success: true,
        data: {
          redemptionCode: result.redemptionCode,
          message: 'Reward redeemed successfully'
        }
      },
      HttpStatus.OK,
      requestId
    );
  } catch (err) {
    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/loyalty/rewards', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Failed to redeem reward', err instanceof Error ? err : new Error(String(err)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Internal server error', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
