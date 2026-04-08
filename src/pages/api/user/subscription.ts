/**
 * User Subscription Management
 * GET /api/user/subscription - Get active subscription
 * POST /api/user/subscription/upgrade - Upgrade subscription
 * POST /api/user/subscription/cancel - Cancel subscription
 */

import type { APIRoute } from 'astro';
import { getActiveSubscription, upgradeSubscription, cancelSubscription, getTierFeatures } from '../../../lib/subscription-management';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { logger } from '../../../lib/logging';
import { recordRequest } from '../../../lib/metrics';
import { validateWithSchema } from '../../../lib/validation';

const upgradeSchema = {
  tierId: {
    type: 'string' as const,
    required: true,
    minLength: 36,
    maxLength: 36
  },
  billingCycle: {
    type: 'string' as const,
    required: false,
    pattern: '^(monthly|annual)$'
  }
} as any;

// GET - Get active subscription
export const GET: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user) {
      recordRequest('GET', '/api/user/subscription', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(
        ErrorCode.UNAUTHORIZED,
        'Authentication required',
        HttpStatus.UNAUTHORIZED,
        undefined,
        requestId
      );
    }

    const subscription = await getActiveSubscription(locals.user.id);
    const features = subscription ? await getTierFeatures(subscription.tier.id) : [];

    recordRequest('GET', '/api/user/subscription', HttpStatus.OK, Date.now() - startTime);

    return apiResponse({
      success: true,
      subscription,
      features,
      hasActiveSubscription: !!subscription
    }, HttpStatus.OK, requestId);
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/user/subscription', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Failed to get subscription', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to get subscription',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};

// POST - Upgrade or change subscription
export const POST: APIRoute = async ({ request, locals, url }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user) {
      recordRequest('POST', '/api/user/subscription', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(
        ErrorCode.UNAUTHORIZED,
        'Authentication required',
        HttpStatus.UNAUTHORIZED,
        undefined,
        requestId
      );
    }

    const action = url.searchParams.get('action') || 'upgrade';

    if (action === 'cancel') {
      const subscription = await getActiveSubscription(locals.user.id);

      if (!subscription) {
        recordRequest('POST', '/api/user/subscription', HttpStatus.NOT_FOUND, Date.now() - startTime);
        return apiError(
          ErrorCode.NOT_FOUND,
          'No active subscription found',
          HttpStatus.NOT_FOUND,
          undefined,
          requestId
        );
      }

      const success = await cancelSubscription(subscription.id);

      if (!success) {
        throw new Error('Failed to cancel subscription');
      }

      recordRequest('POST', '/api/user/subscription', HttpStatus.OK, Date.now() - startTime);
      logger.logMutation('cancel', 'subscriptions', subscription.id, locals.user.id);

      return apiResponse({
        success: true,
        message: 'Abonelik başarıyla iptal edildi'
      }, HttpStatus.OK, requestId);
    }

    // Upgrade action
    const body = await request.json();
    const validation = validateWithSchema(body, upgradeSchema);

    if (!validation.valid) {
      recordRequest('POST', '/api/user/subscription', HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Invalid input',
        HttpStatus.UNPROCESSABLE_ENTITY,
        validation.errors,
        requestId
      );
    }

    const { tierId, billingCycle } = validation.data;

    const newSubscription = await upgradeSubscription(
      locals.user.id,
      tierId,
      billingCycle || 'monthly'
    );

    if (!newSubscription) {
      throw new Error('Failed to upgrade subscription');
    }

    recordRequest('POST', '/api/user/subscription', HttpStatus.CREATED, Date.now() - startTime);
    logger.logMutation('upgrade', 'subscriptions', newSubscription.id, locals.user.id);

    return apiResponse({
      success: true,
      subscription: newSubscription,
      message: 'Abonelik başarıyla yükseltildi'
    }, HttpStatus.CREATED, requestId);
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/user/subscription', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Failed to manage subscription', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to manage subscription',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
