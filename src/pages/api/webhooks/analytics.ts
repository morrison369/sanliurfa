import type { APIRoute } from 'astro';
import { pool } from '../../../lib/postgres';
import { getWebhookMetrics } from '../../../lib/webhook-analytics';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { logger } from '../../../lib/logging';

/**
 * GET /api/webhooks/analytics
 * Get webhook metrics and analytics for authenticated user
 */
export const GET: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.id) {
      return apiError(
        ErrorCode.AUTH_REQUIRED,
        'Authentication required',
        HttpStatus.UNAUTHORIZED,
        undefined,
        requestId
      );
    }

    const metrics = await getWebhookMetrics(pool, locals.user.id);

    return apiResponse(
      {
        success: true,
        data: metrics
      },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    logger.error('Failed to get webhook analytics', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to get webhook analytics',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
