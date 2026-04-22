/**
 * API: Loyalty Rewards
 * GET - Rewards catalog
 * POST - Redeem a reward
 */
import type { APIRoute } from 'astro';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { getRewardsCatalog, redeemReward, getPromotionalOffers } from '../../../lib/rewards';
import { recordRequest } from '../../../lib/metrics';
import { logger } from '../../../lib/logging';

export const GET: APIRoute = async ({ request, url }) => {
  const requestId = getRequestId(request as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    const category = url.searchParams.get('category');
    const tier = url.searchParams.get('tier');
    const includePromos = url.searchParams.get('includePromos') === 'true';

    const filters = {
      category: category || undefined,
      tier: tier || undefined
    };

    const rewards = await getRewardsCatalog(filters);
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
    logger.error('Ödüller alınamadı', err instanceof Error ? err : new Error(String(err)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Sunucu hatası', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};

export const POST: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId(request as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.id) {
      recordRequest('POST', '/api/loyalty/rewards', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(ErrorCode.UNAUTHORIZED, 'Oturum açmanız gerekiyor', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const body = await request.json();
    const { rewardId } = body;

    if (!rewardId) {
      recordRequest('POST', '/api/loyalty/rewards', HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
      return apiError(ErrorCode.VALIDATION_ERROR, 'Ödül ID gereklidir', HttpStatus.UNPROCESSABLE_ENTITY, undefined, requestId);
    }

    const result = await redeemReward(locals.user.id, rewardId);

    if (!result.success) {
      recordRequest('POST', '/api/loyalty/rewards', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(ErrorCode.BAD_REQUEST, result.error || 'Ödül kullanılamadı', HttpStatus.BAD_REQUEST, undefined, requestId);
    }

    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/loyalty/rewards', HttpStatus.OK, duration);
    logger.logMutation('redeem_reward', 'reward_redemptions', rewardId, locals.user?.id);

    return apiResponse(
      {
        success: true,
        data: {
          redemptionCode: result.redemptionCode,
          message: 'Ödül başarıyla kullanıldı'
        }
      },
      HttpStatus.OK,
      requestId
    );
  } catch (err) {
    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/loyalty/rewards', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Ödül kullanılamadı', err instanceof Error ? err : new Error(String(err)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Sunucu hatası', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
