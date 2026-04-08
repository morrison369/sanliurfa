/**
 * Admin: Subscription Analytics
 * GET /api/admin/subscriptions/analytics - Get subscription metrics and analytics
 */

import type { APIRoute } from 'astro';
import { getSubscriptionAnalytics, getWebhookStatus } from '../../../../lib/subscription-admin';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../lib/api';
import { logger } from '../../../../lib/logging';
import { recordRequest } from '../../../../lib/metrics';

export const GET: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    // Check admin access
    if (!locals.isAdmin) {
      recordRequest('GET', '/api/admin/subscriptions/analytics', HttpStatus.FORBIDDEN, Date.now() - startTime);
      return apiError(
        ErrorCode.FORBIDDEN,
        'Admin access required',
        HttpStatus.FORBIDDEN,
        undefined,
        requestId
      );
    }

    // Get analytics
    const subscriptionAnalytics = await getSubscriptionAnalytics();
    const webhookStatus = await getWebhookStatus();

    recordRequest('GET', '/api/admin/subscriptions/analytics', HttpStatus.OK, Date.now() - startTime);

    return apiResponse(
      {
        success: true,
        subscriptions: subscriptionAnalytics,
        webhooks: webhookStatus,
        timestamp: new Date().toISOString(),
      },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/admin/subscriptions/analytics', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Failed to get analytics', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to get analytics',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
