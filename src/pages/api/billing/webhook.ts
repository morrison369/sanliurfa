/**
 * Stripe Webhook Handler
 * Receives and processes Stripe webhook events
 */

import type { APIRoute } from 'astro';
import { verifyWebhookSignature, handleWebhookEvent } from '../../../lib/stripe';
import { logger } from '../../../lib/logging';
import { recordRequest } from '../../../lib/metrics';
import { apiError, apiResponse, ErrorCode, HttpStatus, getRequestId } from '../../../lib/api';

export const POST: APIRoute = async ({ request }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    logger.info('Legacy billing webhook endpoint invoked; canonical ingestion is /api/webhooks/stripe');

    // Get raw body for signature verification
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      logger.warn('Webhook received without signature');
      recordRequest('POST', '/api/billing/webhook', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'No signature provided',
        HttpStatus.BAD_REQUEST,
        undefined,
        requestId
      );
    }

    // Verify webhook signature
    const event = verifyWebhookSignature(body, signature);

    if (!event) {
      logger.warn('Webhook signature verification failed');
      recordRequest('POST', '/api/billing/webhook', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(
        ErrorCode.AUTH_ERROR,
        'Signature verification failed',
        HttpStatus.UNAUTHORIZED,
        undefined,
        requestId
      );
    }

    logger.info('Webhook event received', { eventId: event.id, eventType: event.type });

    // Handle the webhook event
    const handled = await handleWebhookEvent(event);

    if (!handled) {
      logger.error('Webhook event handling failed', new Error(`Failed to handle event ${event.id}`), { eventType: event.type });
      recordRequest('POST', '/api/billing/webhook', HttpStatus.INTERNAL_SERVER_ERROR, Date.now() - startTime);
      return apiError(
        ErrorCode.INTERNAL_ERROR,
        'Event handling failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
        undefined,
        requestId
      );
    }

    logger.info('Webhook event processed successfully', { eventId: event.id });
    recordRequest('POST', '/api/billing/webhook', HttpStatus.OK, Date.now() - startTime);
    const response = apiResponse({ processed: true, eventId: event.id }, HttpStatus.OK, requestId);
    response.headers.set('X-Webhook-Endpoint', 'legacy-billing-proxy');
    response.headers.set('X-Webhook-Canonical', '/api/webhooks/stripe');
    return response;
  } catch (error) {
    logger.error('Webhook error', error instanceof Error ? error : new Error(String(error)));
    recordRequest('POST', '/api/billing/webhook', HttpStatus.INTERNAL_SERVER_ERROR, Date.now() - startTime);
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Webhook error',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
