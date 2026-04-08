/**
 * Create Subscription Checkout Session
 * POST /api/subscriptions/checkout - Create Stripe checkout session for tier upgrade
 */

import type { APIRoute } from 'astro';
import { queryOne } from '../../../lib/postgres';
import { createCheckoutSession } from '../../../lib/stripe-client';
import { getSubscriptionTiers } from '../../../lib/subscription-management';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { logger } from '../../../lib/logging';
import { recordRequest } from '../../../lib/metrics';
import { validateWithSchema } from '../../../lib/validation';

const checkoutSchema = {
  tierId: {
    type: 'string' as const,
    required: true,
    minLength: 36,
    maxLength: 36,
  },
  billingCycle: {
    type: 'string' as const,
    required: false,
    pattern: '^(monthly|annual)$',
  },
  successUrl: {
    type: 'string' as const,
    required: false,
  },
  cancelUrl: {
    type: 'string' as const,
    required: false,
  },
} as any;

export const POST: APIRoute = async ({ request, locals, url }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    // Check authentication
    if (!locals.user) {
      recordRequest('POST', '/api/subscriptions/checkout', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(
        ErrorCode.UNAUTHORIZED,
        'Authentication required',
        HttpStatus.UNAUTHORIZED,
        undefined,
        requestId
      );
    }

    // Validate request
    const body = await request.json();
    const validation = validateWithSchema(body, checkoutSchema);

    if (!validation.valid) {
      recordRequest('POST', '/api/subscriptions/checkout', HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Invalid input',
        HttpStatus.UNPROCESSABLE_ENTITY,
        validation.errors,
        requestId
      );
    }

    const { tierId, billingCycle = 'monthly' } = validation.data;
    let { successUrl, cancelUrl } = validation.data;

    // Set default URLs
    const baseUrl = `${url.protocol}//${url.host}`;
    successUrl = successUrl || `${baseUrl}/abonelik?success=true`;
    cancelUrl = cancelUrl || `${baseUrl}/fiyatlandirma?cancelled=true`;

    // Get tier details
    const tiers = await getSubscriptionTiers();
    const tier = tiers.find((t: any) => t.id === tierId);

    if (!tier) {
      recordRequest('POST', '/api/subscriptions/checkout', HttpStatus.NOT_FOUND, Date.now() - startTime);
      return apiError(
        ErrorCode.NOT_FOUND,
        'Tier not found',
        HttpStatus.NOT_FOUND,
        undefined,
        requestId
      );
    }

    // Check if user is trying to upgrade to same or lower tier
    const currentSub = await queryOne(
      `SELECT tier_id FROM subscriptions WHERE user_id = $1 AND status = 'active'`,
      [locals.user.id]
    );

    if (currentSub && currentSub.tier_id === tierId) {
      recordRequest('POST', '/api/subscriptions/checkout', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Already subscribed to this tier',
        HttpStatus.BAD_REQUEST,
        undefined,
        requestId
      );
    }

    // Create Stripe checkout session
    const session = await createCheckoutSession({
      userId: locals.user.id,
      tierId,
      tierName: tier.displayName,
      tierPrice: billingCycle === 'annual' ? (tier.annualPrice || tier.monthlyPrice * 12) : tier.monthlyPrice,
      billingCycle: billingCycle as 'monthly' | 'annual',
      successUrl,
      cancelUrl,
      customerEmail: locals.user.email,
    });

    recordRequest('POST', '/api/subscriptions/checkout', HttpStatus.CREATED, Date.now() - startTime);
    logger.logMutation('create_checkout', 'checkout_sessions', session.id, locals.user.id, { tierId, billingCycle });

    return apiResponse(
      {
        success: true,
        sessionId: session.id,
        checkoutUrl: session.url,
        tier: {
          id: tier.id,
          displayName: tier.displayName,
          price: billingCycle === 'annual' ? (tier.annualPrice || tier.monthlyPrice * 12) : tier.monthlyPrice,
          billingCycle,
        },
      },
      HttpStatus.CREATED,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/subscriptions/checkout', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Failed to create checkout session', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to create checkout session',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
