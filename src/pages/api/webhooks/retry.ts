import type { APIRoute } from 'astro';
import { pool } from '../../../lib/postgres';
import { retryFailedWebhooks } from '../../../lib/webhook-analytics';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { logger } from '../../../lib/logging';
import { enforceRateLimitPolicy, getClientIpAddress } from '../../../lib/sensitive-endpoint-policy';
import { recordRequest } from '../../../lib/metrics';

/**
 * POST /api/webhooks/retry
 * Retry failed webhook events
 */
export const POST: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.id) {
      recordRequest('POST', '/api/webhooks/retry', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(
        ErrorCode.AUTH_REQUIRED,
        'Authentication required',
        HttpStatus.UNAUTHORIZED,
        undefined,
        requestId
      );
    }

    const rateLimitResponse = await enforceRateLimitPolicy({
      request,
      requestId,
      key: `webhook:retry:post:${getClientIpAddress(request)}:${locals.user.id}`,
      limit: 15,
      windowSeconds: 60,
      message: 'Too many webhook retry requests'
    });

    if (rateLimitResponse) {
      recordRequest('POST', '/api/webhooks/retry', HttpStatus.RATE_LIMITED, Date.now() - startTime);
      return rateLimitResponse;
    }

    const contentType = request.headers.get('content-type') || '';
    if (!contentType.toLowerCase().includes('application/json')) {
      recordRequest('POST', '/api/webhooks/retry', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Content-Type must be application/json',
        HttpStatus.BAD_REQUEST,
        undefined,
        requestId
      );
    }

    let body: any;
    try {
      body = await request.json();
    } catch {
      recordRequest('POST', '/api/webhooks/retry', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Invalid JSON payload',
        HttpStatus.BAD_REQUEST,
        undefined,
        requestId
      );
    }

    const { eventId, webhookId } = body;
    const fingerprint = eventId ? `event:${eventId}` : webhookId ? `webhook:${webhookId}` : 'all';
    const duplicateBurstResponse = await enforceRateLimitPolicy({
      request,
      requestId,
      key: `webhook:retry:fingerprint:${getClientIpAddress(request)}:${locals.user.id}:${fingerprint}`,
      limit: 1,
      windowSeconds: 20,
      message: 'Duplicate retry request detected. Please wait before retrying.'
    });

    if (duplicateBurstResponse) {
      recordRequest('POST', '/api/webhooks/retry', HttpStatus.RATE_LIMITED, Date.now() - startTime);
      return duplicateBurstResponse;
    }

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
        recordRequest('POST', '/api/webhooks/retry', HttpStatus.NOT_FOUND, Date.now() - startTime);
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
        recordRequest('POST', '/api/webhooks/retry', HttpStatus.NOT_FOUND, Date.now() - startTime);
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

    recordRequest('POST', '/api/webhooks/retry', HttpStatus.OK, Date.now() - startTime);
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
    recordRequest('POST', '/api/webhooks/retry', HttpStatus.INTERNAL_SERVER_ERROR, Date.now() - startTime);
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to retry webhooks',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
