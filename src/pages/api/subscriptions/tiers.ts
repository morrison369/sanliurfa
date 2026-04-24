/**
 * Get Subscription Tiers
 * GET /api/subscriptions/tiers - Get all available subscription tiers
 */

import type { APIRoute } from 'astro';
import { getSubscriptionTiers } from '../../../lib/subscription/subscription-management';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { logger } from '../../../lib/logging';
import { recordRequest } from '../../../lib/metrics';
import { PHASE1_FREE_MODE } from '../../../lib/runtime/phase-policy';

export const GET: APIRoute = async ({ request }) => {
  const requestId = getRequestId(request);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    const tiers = await getSubscriptionTiers();
    const normalizedTiers = PHASE1_FREE_MODE
      ? tiers.map((tier: any) => ({
          ...tier,
          monthlyPrice: 0,
          annualPrice: 0,
          effectiveMonthlyPrice: 0,
          effectiveAnnualPrice: 0,
        }))
      : tiers;

    recordRequest('GET', '/api/subscriptions/tiers', HttpStatus.OK, Date.now() - startTime);

    return apiResponse({
      success: true,
      phase1FreeMode: PHASE1_FREE_MODE,
      checkoutDisabled: PHASE1_FREE_MODE,
      tiers: normalizedTiers,
      count: normalizedTiers.length
    }, HttpStatus.OK, requestId);
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/subscriptions/tiers', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Failed to get subscription tiers', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to get subscription tiers',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
