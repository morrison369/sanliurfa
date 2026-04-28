import type { APIRoute } from 'astro';
import type { Pool } from 'pg';
import { pool as postgresPool } from '../../../lib/postgres';
import { getWebhookLogs, getWebhookLogsSummary, clearOldWebhookLogs } from '../../../lib/webhook/webhook-logs';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId, safeIntParam } from '../../../lib/api';
import { logger } from '../../../lib/logging';

/**
 * GET /api/webhooks/logs?webhookId=xxx&limit=50&offset=0
 * Get webhook delivery logs
 */
export const GET: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId(request);
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.id) {
      return apiError(ErrorCode.UNAUTHORIZED, 'Authentication required', HttpStatus.UNAUTHORIZED);
    }

    const url = new URL(request.url);
    const webhookId = url.searchParams.get('webhookId');
    const summary = url.searchParams.get('summary') === 'true';
    const limit = safeIntParam(url.searchParams.get('limit'), 50, 1, 100);
    const offset = safeIntParam(url.searchParams.get('offset'), 0, 0, 1_000_000);

    if (!webhookId) {
      return apiError(ErrorCode.VALIDATION_ERROR, 'Webhook ID required', HttpStatus.BAD_REQUEST);
    }

    if (summary) {
      // Return summary only
      const summaryData = await getWebhookLogsSummary(postgresPool as unknown as Pool, webhookId, locals.user.id);
      return apiResponse(
        { success: true, data: summaryData },
        HttpStatus.OK,
        requestId
      );
    }

    // Return paginated logs
    const { logs, total } = await getWebhookLogs(postgresPool as unknown as Pool, webhookId, locals.user.id, limit, offset);

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
  const requestId = getRequestId(request);
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.id) {
      return apiError(ErrorCode.UNAUTHORIZED, 'Authentication required', HttpStatus.UNAUTHORIZED);
    }

    const url = new URL(request.url);
    const webhookId = url.searchParams.get('webhookId');
    const olderThanDays = safeIntParam(url.searchParams.get('olderThanDays'), 30, 0, 1_000_000);

    if (!webhookId) {
      return apiError(ErrorCode.VALIDATION_ERROR, 'Webhook ID required', HttpStatus.BAD_REQUEST);
    }

    const deletedCount = await clearOldWebhookLogs(postgresPool as unknown as Pool, webhookId, locals.user.id, olderThanDays);

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
