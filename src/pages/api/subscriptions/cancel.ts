/**
 * Cancel Subscription
 * POST /api/subscriptions/cancel - Cancel active subscription
 */

import type { APIRoute } from 'astro';
import { queryOne, update as updateDb } from '../../../lib/postgres';
import { cancelSubscription } from '../../../lib/stripe-client';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { logger } from '../../../lib/logging';
import { recordRequest } from '../../../lib/metrics';

export const POST: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    // Check authentication
    if (!locals.user) {
      recordRequest('POST', '/api/subscriptions/cancel', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(
        ErrorCode.UNAUTHORIZED,
        'Authentication required',
        HttpStatus.UNAUTHORIZED,
        undefined,
        requestId
      );
    }

    // Get active subscription
    const subscription = await queryOne(
      `SELECT id, stripe_subscription_id, status FROM subscriptions
       WHERE user_id = $1 AND status = 'active'`,
      [locals.user.id]
    );

    if (!subscription) {
      recordRequest('POST', '/api/subscriptions/cancel', HttpStatus.NOT_FOUND, Date.now() - startTime);
      return apiError(
        ErrorCode.NOT_FOUND,
        'No active subscription found',
        HttpStatus.NOT_FOUND,
        undefined,
        requestId
      );
    }

    // Cancel Stripe subscription (will end at period end)
    if (subscription.stripe_subscription_id) {
      try {
        await cancelSubscription(subscription.stripe_subscription_id, false);
      } catch (err) {
        logger.warn('Failed to cancel Stripe subscription', err);
        // Continue anyway - mark as cancelled in our DB
      }
    }

    // Mark subscription as cancelled in our database
    await updateDb('subscriptions', subscription.id, {
      status: 'cancelled',
      end_date: new Date().toISOString(),
    });

    recordRequest('POST', '/api/subscriptions/cancel', HttpStatus.OK, Date.now() - startTime);
    logger.logMutation('cancel', 'subscriptions', subscription.id, locals.user.id);

    return apiResponse(
      {
        success: true,
        message: 'Abonelik başarıyla iptal edildi. Plan aylık sonunda sona erecektir.',
      },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/subscriptions/cancel', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Failed to cancel subscription', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to cancel subscription',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
