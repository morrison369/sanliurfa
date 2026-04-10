/**
 * Stripe Webhook Handler
 * POST /api/webhooks/stripe - Handle Stripe events
 */

import type { APIRoute } from 'astro';
import { queryOne, query } from '../../../lib/postgres';
import { verifyWebhookSignature } from '../../../lib/stripe-client';
import { logger } from '../../../lib/logging';
import { recordRequest } from '../../../lib/metrics';
import { apiError, apiResponse, ErrorCode, HttpStatus, getRequestId } from '../../../lib/api';
import { decideWebhookRetry } from '../../../lib/webhook-delivery-policy';
import { processStripeWebhookBusinessEvent } from '../../../lib/stripe-webhook-business';

export const POST: APIRoute = async ({ request }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);
  let deliveryId: string | undefined;

  try {
    // Get raw body for signature verification
    const rawBody = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      const duration = Date.now() - startTime;
      recordRequest('POST', '/api/webhooks/stripe', HttpStatus.BAD_REQUEST, duration);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Missing stripe-signature header',
        HttpStatus.BAD_REQUEST,
        undefined,
        requestId
      );
    }

    // Verify webhook signature
    const event = await verifyWebhookSignature(rawBody, signature);
    const existingDelivery = await queryOne(
      `SELECT id, status, retry_count, last_tried_at
       FROM webhook_deliveries
       WHERE stripe_event_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [event.id]
    );

    if (existingDelivery?.status === 'completed') {
      recordRequest('POST', '/api/webhooks/stripe', HttpStatus.OK, Date.now() - startTime, {
        error: 'duplicate_delivery'
      });
      logger.info('Duplicate Stripe webhook ignored', { eventType: event.type, eventId: event.id });
      return apiResponse({ received: true, duplicate: true }, HttpStatus.OK, requestId);
    }

    const retryDecision = decideWebhookRetry(existingDelivery);
    if (existingDelivery?.id && !retryDecision.shouldProcess) {
      recordRequest('POST', '/api/webhooks/stripe', HttpStatus.OK, Date.now() - startTime, {
        error: retryDecision.exhausted === true ? 'retry_exhausted' : 'retry_deferred'
      });
      logger.info('Stripe webhook retry deferred', {
        eventType: event.type,
        eventId: event.id,
        deliveryId: existingDelivery.id,
        retryAfterSeconds: retryDecision.retryAfterSeconds,
        exhausted: retryDecision.exhausted === true,
      });

      return apiResponse({
        received: true,
        duplicate: true,
        retryDelayed: true,
        exhausted: retryDecision.exhausted === true,
        retryAfterSeconds: retryDecision.retryAfterSeconds,
      }, HttpStatus.OK, requestId);
    }

    const delivery = existingDelivery || await queryOne(
      `INSERT INTO webhook_deliveries (event_type, stripe_event_id, payload, status, last_tried_at)
       VALUES ($1, $2, $3::jsonb, 'processing', NOW())
       RETURNING id`,
      [event.type, event.id, rawBody]
    );
    deliveryId = delivery?.id;

    if (existingDelivery?.id) {
      await query(
        `UPDATE webhook_deliveries
         SET status = 'processing', retry_count = COALESCE(retry_count, 0) + 1, last_tried_at = NOW()
         WHERE id = $1`,
        [existingDelivery.id]
      );
    }

    recordRequest('POST', '/api/webhooks/stripe', 200, Date.now() - startTime);
    logger.info('Stripe webhook received', { eventType: event.type, eventId: event.id });

    await processStripeWebhookBusinessEvent(event);

    await query(
      `UPDATE webhook_deliveries
       SET status = 'completed', http_status = 200, response_body = $2, completed_at = NOW()
       WHERE id = $1`,
      [delivery.id, JSON.stringify({ received: true })]
    );

    return apiResponse({ received: true }, HttpStatus.OK, requestId);
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/webhooks/stripe', 400, duration, {
      error: 'signature_verification_failed'
    });
    logger.error('Webhook verification failed', error instanceof Error ? error : new Error(String(error)));

    if (deliveryId) {
      await query(
        `UPDATE webhook_deliveries
         SET status = 'failed', http_status = 400, response_body = $2, completed_at = NOW()
         WHERE id = $1`,
        [deliveryId, JSON.stringify({ error: 'Webhook signature verification failed' })]
      );
    }

    return apiError(
      ErrorCode.AUTH_ERROR,
      'Webhook signature verification failed',
      HttpStatus.BAD_REQUEST,
      undefined,
      requestId
    );
  }
};
