/**
 * Email Queue Status API
 * GET: Get queue statistics and status
 */

import type { APIRoute } from 'astro';
import { getQueueStats } from '../../../lib/email-service';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { recordRequest } from '../../../lib/metrics';
import { logger } from '../../../lib/logging';

export const GET: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.id) {
      recordRequest('GET', '/api/email/queue', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(ErrorCode.AUTH_REQUIRED, 'Authentication required', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const stats = await getQueueStats();

    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/email/queue', HttpStatus.OK, duration);

    return apiResponse(
      {
        success: true,
        data: {
          pending: stats.pending,
          sent: stats.sent,
          failed: stats.failed,
          avgDeliveryTime: Math.round(stats.avgDeliveryTime),
        },
      },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/email/queue', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Get queue stats failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to get queue stats',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
