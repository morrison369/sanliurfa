import type { APIRoute } from 'astro';
import { pool } from '../../../lib/postgres';
import { retryFailedWebhooks } from '../../../lib/webhook-analytics';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { logger } from '../../../lib/logging';

/**
 * POST /api/webhooks/retry
 * Retry failed webhook events
 */
export const POST: APIRoute = async ({ request, locals }) => {
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

    const body = await request.json();
    const { eventId, webhookId } = body;

    let retryCount = 0;

    if (eventId) {
      // Retry specific event (optimized: select only id to check existence)
      const eventRes = await pool.query(
        `SELECT we.id FROM webhook_events we
         JOIN webhooks w ON we.webhook_id = w.id
         WHERE we.id = $1 AND w.user_id = $2 AND we.status = 'failed'`,
        [eventId, locals.user.id]
      );

      if (eventRes.rows.length === 0) {
        return apiError(
          ErrorCode.NOT_FOUND,
          'Failed event not found',
          HttpStatus.NOT_FOUND,
          undefined,
          requestId
        );
      }

      retryCount = await retryFailedWebhooks(pool, locals.user.id, eventId);
    } else if (webhookId) {
      // Retry all failed events for a webhook (optimized: select only id to check existence)
      const webhookRes = await pool.query(
        'SELECT id FROM webhooks WHERE id = $1 AND user_id = $2',
        [webhookId, locals.user.id]
      );

      if (webhookRes.rows.length === 0) {
        return apiError(
          ErrorCode.NOT_FOUND,
          'Webhook not found',
          HttpStatus.NOT_FOUND,
          undefined,
          requestId
        );
      }

      const updateRes = await pool.query(
        `UPDATE webhook_events
         SET status = 'pending', attempts = 0, next_retry_at = NOW()
         WHERE webhook_id = $1 AND status = 'failed'`,
        [webhookId]
      );

      retryCount = updateRes.rowCount || 0;
    } else {
      // Retry all failed events for user
      retryCount = await retryFailedWebhooks(pool, locals.user.id);
    }

    logger.info('Webhooks retried', {
      userId: locals.user.id,
      eventId: eventId || null,
      webhookId: webhookId || null,
      count: retryCount
    });

    return apiResponse(
      {
        success: true,
        message: `${retryCount} failed event(s) queued for retry`,
        data: {
          retriedCount: retryCount
        }
      },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    logger.error('Failed to retry webhooks', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to retry webhooks',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
