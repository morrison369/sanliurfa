/**
 * Stripe Subscription Checkout
 */

import type { APIRoute } from 'astro';
import { createSubscription } from '../../../lib/stripe';
import { queryOne } from '../../../lib/postgres';
import { validateWithSchema } from '../../../lib/validation';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { recordRequest } from '../../../lib/metrics';
import { logger } from '../../../lib/logging';

const checkoutSchema = {
  tier: {
    type: 'string' as const,
    required: true,
    pattern: '^(premium|pro)$'
  },
  priceId: {
    type: 'string' as const,
    required: true
  }
};

export const POST: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    // Check authentication
    if (!locals.user?.id) {
      recordRequest('POST', '/api/billing/checkout', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(ErrorCode.AUTH_REQUIRED, 'Authentication required', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    // Parse and validate input
    const body = await request.json();
    const validation = validateWithSchema(body, checkoutSchema as any);

    if (!validation.valid) {
      recordRequest('POST', '/api/billing/checkout', HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Invalid checkout parameters',
        HttpStatus.UNPROCESSABLE_ENTITY,
        validation.errors,
        requestId
      );
    }

    const { tier, priceId } = validation.data as { tier: 'premium' | 'pro'; priceId: string };

    // Get user email
    const userResult = await queryOne('SELECT email FROM users WHERE id = $1', [locals.user.id]);
    if (!userResult) {
      recordRequest('POST', '/api/billing/checkout', HttpStatus.NOT_FOUND, Date.now() - startTime);
      return apiError(ErrorCode.NOT_FOUND, 'User not found', HttpStatus.NOT_FOUND, undefined, requestId);
    }

    // Create subscription
    const subscription = await createSubscription(locals.user.id, priceId, tier);

    if (!subscription) {
      recordRequest('POST', '/api/billing/checkout', HttpStatus.INTERNAL_SERVER_ERROR, Date.now() - startTime);
      return apiError(
        ErrorCode.INTERNAL_ERROR,
        'Failed to create subscription',
        HttpStatus.INTERNAL_SERVER_ERROR,
        undefined,
        requestId
      );
    }

    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/billing/checkout', HttpStatus.OK, duration);
    logger.logMutation('create', 'memberships', locals.user.id, locals.user.id, { tier, duration });

    return apiResponse({ success: true, data: subscription }, HttpStatus.OK, requestId);
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/billing/checkout', HttpStatus.INTERNAL_SERVER_ERROR, duration, {
      error: error instanceof Error ? error.message : String(error)
    });
    logger.error('Checkout failed', error instanceof Error ? error : new Error(String(error)), { duration });
    return apiError(ErrorCode.INTERNAL_ERROR, 'Internal server error', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
