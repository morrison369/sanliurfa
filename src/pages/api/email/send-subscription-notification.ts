/**
 * Send Subscription Notification Email
 * POST /api/email/send-subscription-notification
 * Sends various subscription-related emails
 */

import type { APIRoute } from 'astro';
import { validateWithSchema } from '../../../lib/validation';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { recordRequest } from '../../../lib/metrics';
import { logger } from '../../../lib/logging';
import {
  emailOnSubscriptionCreated,
  emailOnPlanUpgrade,
  emailOnPlanDowngrade,
  emailOnSubscriptionCancelled,
  emailOnPaymentSuccess,
  emailOnPaymentFailed,
  emailOnSubscriptionRenewal
} from '../../../lib/subscription-email-integration';

const schema = {
  eventType: {
    type: 'string' as const,
    required: true,
    pattern: '^(subscription_created|plan_upgrade|plan_downgrade|subscription_cancelled|payment_success|payment_failed|subscription_renewal)$'
  },
  userId: {
    type: 'string' as const,
    required: true,
    minLength: 36,
    maxLength: 36
  },
  tierId: {
    type: 'string' as const,
    required: true,
    minLength: 36,
    maxLength: 36
  },
  oldTierId: {
    type: 'string' as const,
    required: false,
    minLength: 36,
    maxLength: 36
  },
  amount: {
    type: 'number' as const,
    required: false,
    min: 0
  },
  billingCycle: {
    type: 'string' as const,
    required: false,
    pattern: '^(monthly|yearly)$'
  },
  price: {
    type: 'number' as const,
    required: false,
    min: 0
  },
  accessUntilDate: {
    type: 'string' as const,
    required: false
  },
  nextBillingDate: {
    type: 'string' as const,
    required: false
  },
  retryDate: {
    type: 'string' as const,
    required: false
  },
  renewalDate: {
    type: 'string' as const,
    required: false
  },
  creditAmount: {
    type: 'number' as const,
    required: false,
    min: 0
  },
  additionalCost: {
    type: 'number' as const,
    required: false,
    min: 0
  }
} as any;

export const POST: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    // Check authentication - admin only
    if (!locals.isAdmin) {
      recordRequest('POST', '/api/email/send-subscription-notification', HttpStatus.FORBIDDEN, Date.now() - startTime);
      return apiError(
        ErrorCode.FORBIDDEN,
        'Admin access required',
        HttpStatus.FORBIDDEN,
        undefined,
        requestId
      );
    }

    const body = await request.json();
    const validation = validateWithSchema(body, schema);

    if (!validation.valid) {
      recordRequest('POST', '/api/email/send-subscription-notification', HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Invalid input',
        HttpStatus.UNPROCESSABLE_ENTITY,
        validation.errors,
        requestId
      );
    }

    const {
      eventType,
      userId,
      tierId,
      oldTierId,
      amount,
      billingCycle,
      price,
      accessUntilDate,
      nextBillingDate,
      retryDate,
      renewalDate,
      creditAmount,
      additionalCost
    } = validation.data as any;

    let success = false;

    switch (eventType) {
      case 'subscription_created':
        success = await emailOnSubscriptionCreated(
          userId,
          tierId,
          billingCycle || 'monthly',
          price || 0
        );
        break;

      case 'plan_upgrade':
        if (!oldTierId) {
          recordRequest('POST', '/api/email/send-subscription-notification', HttpStatus.BAD_REQUEST, Date.now() - startTime);
          return apiError(
            ErrorCode.BAD_REQUEST,
            'oldTierId required for plan_upgrade',
            HttpStatus.BAD_REQUEST,
            undefined,
            requestId
          );
        }
        success = await emailOnPlanUpgrade(
          userId,
          oldTierId,
          tierId,
          additionalCost || 0
        );
        break;

      case 'plan_downgrade':
        if (!oldTierId) {
          recordRequest('POST', '/api/email/send-subscription-notification', HttpStatus.BAD_REQUEST, Date.now() - startTime);
          return apiError(
            ErrorCode.BAD_REQUEST,
            'oldTierId required for plan_downgrade',
            HttpStatus.BAD_REQUEST,
            undefined,
            requestId
          );
        }
        success = await emailOnPlanDowngrade(
          userId,
          oldTierId,
          tierId,
          creditAmount || 0
        );
        break;

      case 'subscription_cancelled':
        if (!accessUntilDate) {
          recordRequest('POST', '/api/email/send-subscription-notification', HttpStatus.BAD_REQUEST, Date.now() - startTime);
          return apiError(
            ErrorCode.BAD_REQUEST,
            'accessUntilDate required for subscription_cancelled',
            HttpStatus.BAD_REQUEST,
            undefined,
            requestId
          );
        }
        success = await emailOnSubscriptionCancelled(
          userId,
          tierId,
          new Date(accessUntilDate)
        );
        break;

      case 'payment_success':
        if (!amount || !nextBillingDate) {
          recordRequest('POST', '/api/email/send-subscription-notification', HttpStatus.BAD_REQUEST, Date.now() - startTime);
          return apiError(
            ErrorCode.BAD_REQUEST,
            'amount and nextBillingDate required for payment_success',
            HttpStatus.BAD_REQUEST,
            undefined,
            requestId
          );
        }
        success = await emailOnPaymentSuccess(
          userId,
          amount,
          tierId,
          new Date(nextBillingDate)
        );
        break;

      case 'payment_failed':
        if (!amount || !retryDate) {
          recordRequest('POST', '/api/email/send-subscription-notification', HttpStatus.BAD_REQUEST, Date.now() - startTime);
          return apiError(
            ErrorCode.BAD_REQUEST,
            'amount and retryDate required for payment_failed',
            HttpStatus.BAD_REQUEST,
            undefined,
            requestId
          );
        }
        success = await emailOnPaymentFailed(
          userId,
          amount,
          tierId,
          new Date(retryDate)
        );
        break;

      case 'subscription_renewal':
        if (!amount || !renewalDate) {
          recordRequest('POST', '/api/email/send-subscription-notification', HttpStatus.BAD_REQUEST, Date.now() - startTime);
          return apiError(
            ErrorCode.BAD_REQUEST,
            'amount and renewalDate required for subscription_renewal',
            HttpStatus.BAD_REQUEST,
            undefined,
            requestId
          );
        }
        success = await emailOnSubscriptionRenewal(
          userId,
          amount,
          tierId,
          new Date(renewalDate)
        );
        break;

      default:
        recordRequest('POST', '/api/email/send-subscription-notification', HttpStatus.BAD_REQUEST, Date.now() - startTime);
        return apiError(
          ErrorCode.BAD_REQUEST,
          'Invalid event type',
          HttpStatus.BAD_REQUEST,
          undefined,
          requestId
        );
    }

    if (!success) {
      recordRequest('POST', '/api/email/send-subscription-notification', HttpStatus.INTERNAL_SERVER_ERROR, Date.now() - startTime);
      return apiError(
        ErrorCode.INTERNAL_ERROR,
        'Failed to send email',
        HttpStatus.INTERNAL_SERVER_ERROR,
        undefined,
        requestId
      );
    }

    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/email/send-subscription-notification', HttpStatus.OK, duration);
    logger.logMutation('send', 'email_notifications', userId, locals.user?.id);

    return apiResponse(
      {
        success: true,
        message: `${eventType} email sent successfully`
      },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/email/send-subscription-notification', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Failed to send subscription notification', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Internal server error',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
