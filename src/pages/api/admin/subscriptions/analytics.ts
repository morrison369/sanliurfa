import type { APIRoute } from 'astro';
import { getSubscriptionAnalytics, getWebhookStatus } from '../../../../lib/subscription-admin';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../lib/api';
import { logger } from '../../../../lib/logging';
import { recordRequest } from '../../../../lib/metrics';
import { withAdminOpsReadAccess } from '../../../../lib/admin-ops-access';

/**
 * Admin: Subscription Analytics
 * GET /api/admin/subscriptions/analytics - Get subscription metrics and analytics
 */
export const GET: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    return await withAdminOpsReadAccess(
      {
        request,
        locals,
        endpoint: '/api/admin/subscriptions/analytics',
        requestId,
        startTime,
        onDenied: (_response, statusCode, duration) => {
          recordRequest('GET', '/api/admin/subscriptions/analytics', statusCode, duration);
        },
        onSuccess: (response, duration) => {
          recordRequest('GET', '/api/admin/subscriptions/analytics', response.status, duration);
        },
      },
      async () => {
        const subscriptionAnalytics = await getSubscriptionAnalytics();
        const webhookStatus = await getWebhookStatus();

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
      }
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
