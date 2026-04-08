/**
 * Get Subscription Tiers
 * GET /api/subscriptions/tiers - Get all available subscription tiers
 */

import type { APIRoute } from 'astro';
import { getSubscriptionTiers } from '../../../lib/subscription-management';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { logger } from '../../../lib/logging';
import { recordRequest } from '../../../lib/metrics';

export const GET: APIRoute = async ({ request }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    const tiers = await getSubscriptionTiers();

    recordRequest('GET', '/api/subscriptions/tiers', HttpStatus.OK, Date.now() - startTime);

    return apiResponse({
      success: true,
      tiers,
      count: tiers.length
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
