import type { APIRoute } from 'astro';
import { pool } from '../../../lib/postgres';
import { triggerWebhook } from '../../../lib/webhooks';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { logger } from '../../../lib/logging';

/**
 * POST /api/webhooks/test
 * Test a webhook by sending a test event
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
    const { webhookId, testData } = body;

    if (!webhookId) {
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Webhook ID required',
        HttpStatus.BAD_REQUEST,
        undefined,
        requestId
      );
    }

    // Verify webhook belongs to user (optimized: select only needed columns)
    const webhookRes = await pool.query(
      'SELECT id, event, url FROM webhooks WHERE id = $1 AND user_id = $2',
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

    const webhook = webhookRes.rows[0];

    // Trigger test webhook
    const testPayload = testData || {
      test: true,
      timestamp: new Date().toISOString(),
      event: webhook.event,
      message: 'This is a test webhook event'
    };

    await triggerWebhook(webhook.event, testPayload, locals.user.id);

    logger.info('Webhook test triggered', { webhookId, userId: locals.user.id });

    return apiResponse(
      {
        success: true,
        message: 'Test webhook sent successfully',
        data: {
          webhookId,
          event: webhook.event,
          url: webhook.url,
          sentAt: new Date().toISOString()
        }
      },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    logger.error('Failed to test webhook', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to test webhook',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
