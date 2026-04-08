/**
 * Billing History
 * GET /api/user/subscription/billing - Get user's billing history
 */

import type { APIRoute } from 'astro';
import { getBillingHistory } from '../../../../lib/subscription-management';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../lib/api';
import { logger } from '../../../../lib/logging';
import { recordRequest } from '../../../../lib/metrics';

export const GET: APIRoute = async ({ request, locals, url }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user) {
      recordRequest('GET', '/api/user/subscription/billing', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(
        ErrorCode.UNAUTHORIZED,
        'Authentication required',
        HttpStatus.UNAUTHORIZED,
        undefined,
        requestId
      );
    }

    const limit = Math.min(parseInt(url.searchParams.get('limit') || '12'), 50);

    const billing = await getBillingHistory(locals.user.id, limit);

    recordRequest('GET', '/api/user/subscription/billing', HttpStatus.OK, Date.now() - startTime);

    return apiResponse({
      success: true,
      billing,
      count: billing.length
    }, HttpStatus.OK, requestId);
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/user/subscription/billing', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Failed to get billing history', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to get billing history',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
