/**
 * Rewards Catalog API
 * GET: List rewards catalog or user redemptions
 * POST: Redeem reward
 */

import type { APIRoute } from 'astro';
import {
  getRewardsCatalog,
  getFeaturedRewards,
  redeemReward,
  getUserRedemptions
} from '../../../lib/rewards-catalog';
import { getLoyaltyBalance } from '../../../lib/loyalty-system';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { recordRequest } from '../../../lib/metrics';
import { logger } from '../../../lib/logging';

export const GET: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    const url = new URL(request.url);
    const type = url.searchParams.get('type');
    const featured = url.searchParams.get('featured') === 'true';
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const myRedemptions = url.searchParams.get('my') === 'true';

    let data;

    if (myRedemptions) {
      if (!locals.user?.id) {
        recordRequest('GET', '/api/rewards', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
        return apiError(ErrorCode.AUTH_REQUIRED, 'Authentication required', HttpStatus.UNAUTHORIZED, undefined, requestId);
      }
      const status = url.searchParams.get('status');
      data = await getUserRedemptions(locals.user.id, status, limit, offset);
    } else if (featured) {
      data = await getFeaturedRewards(limit);
    } else {
      const filters: any = {};
      if (url.searchParams.get('max_cost')) {
        filters.max_cost = parseInt(url.searchParams.get('max_cost')!);
      }
      if (type) filters.reward_type = type;
      data = await getRewardsCatalog(limit, offset, filters);
    }

    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/rewards', HttpStatus.OK, duration);

    return apiResponse(
      { success: true, data },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/rewards', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Get rewards failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to get rewards',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};

export const POST: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.id) {
      recordRequest('POST', '/api/rewards', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(ErrorCode.AUTH_REQUIRED, 'Authentication required', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const body = await request.json();
    const { reward_id } = body;

    if (!reward_id) {
      recordRequest('POST', '/api/rewards', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'reward_id required',
        HttpStatus.BAD_REQUEST,
        undefined,
        requestId
      );
    }

    // Get user's loyalty balance
    const balance = await getLoyaltyBalance(locals.user.id);
    if (!balance) {
      recordRequest('POST', '/api/rewards', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'User loyalty account not found',
        HttpStatus.BAD_REQUEST,
        undefined,
        requestId
      );
    }

    const redemption = await redeemReward(locals.user.id, reward_id, balance.available_points);

    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/rewards', HttpStatus.CREATED, duration);

    logger.info('Reward redeemed via API', { rewardId: reward_id, userId: locals.user.id });

    return apiResponse(
      { success: true, data: redemption },
      HttpStatus.CREATED,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    const statusCode = (error instanceof Error && error.message.includes('Insufficient')) ? HttpStatus.BAD_REQUEST : HttpStatus.INTERNAL_SERVER_ERROR;
    recordRequest('POST', '/api/rewards', statusCode, duration);
    logger.error('Redeem reward failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      error instanceof Error ? error.message : 'Failed to redeem reward',
      statusCode,
      undefined,
      requestId
    );
  }
};
