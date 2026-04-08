import type { APIRoute } from 'astro';
import { pool } from '../../../lib/postgres';
import { getWebhookLogs, getWebhookLogsSummary, clearOldWebhookLogs } from '../../../lib/webhook-logs';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { logger } from '../../../lib/logging';

/**
 * GET /api/webhooks/logs?webhookId=xxx&limit=50&offset=0
 * Get webhook delivery logs
 */
export const GET: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.id) {
      return apiError(ErrorCode.AUTH_REQUIRED, 'Authentication required', HttpStatus.UNAUTHORIZED);
    }

    const url = new URL(request.url);
    const webhookId = url.searchParams.get('webhookId');
    const summary = url.searchParams.get('summary') === 'true';
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);
    const offset = parseInt(url.searchParams.get('offset') || '0');

    if (!webhookId) {
      return apiError(ErrorCode.VALIDATION_ERROR, 'Webhook ID required', HttpStatus.BAD_REQUEST);
    }

    if (summary) {
      // Return summary only
      const summaryData = await getWebhookLogsSummary(pool, webhookId, locals.user.id);
      return apiResponse(
        { success: true, data: summaryData },
        HttpStatus.OK,
        requestId
      );
    }

    // Return paginated logs
    const { logs, total } = await getWebhookLogs(pool, webhookId, locals.user.id, limit, offset);

    return apiResponse(
      {
        success: true,
        data: logs,
        pagination: {
          limit,
          offset,
          total,
          pages: Math.ceil(total / limit)
        }
      },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    logger.error('Failed to get webhook logs', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Failed to get logs', HttpStatus.INTERNAL_SERVER_ERROR);
  }
};

/**
 * DELETE /api/webhooks/logs?webhookId=xxx&olderThanDays=30
 * Clear old webhook logs
 */
export const DELETE: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.id) {
      return apiError(ErrorCode.AUTH_REQUIRED, 'Authentication required', HttpStatus.UNAUTHORIZED);
    }

    const url = new URL(request.url);
    const webhookId = url.searchParams.get('webhookId');
    const olderThanDays = parseInt(url.searchParams.get('olderThanDays') || '30');

    if (!webhookId) {
      return apiError(ErrorCode.VALIDATION_ERROR, 'Webhook ID required', HttpStatus.BAD_REQUEST);
    }

    const deletedCount = await clearOldWebhookLogs(pool, webhookId, locals.user.id, olderThanDays);

    logger.info('Webhook logs cleared', {
      webhookId,
      userId: locals.user.id,
      deletedCount,
      olderThanDays
    });

    return apiResponse(
      {
        success: true,
        message: `Deleted ${deletedCount} old log entries`,
        data: { deletedCount }
      },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    logger.error('Failed to clear webhook logs', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Failed to clear logs', HttpStatus.INTERNAL_SERVER_ERROR);
  }
};
