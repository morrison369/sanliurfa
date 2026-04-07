/**
 * Stripe Webhook Handler
 * Receives and processes Stripe webhook events
 */

import type { APIRoute } from 'astro';
import { verifyWebhookSignature, handleWebhookEvent } from '../../../lib/stripe';
import { logger } from '../../../lib/logging';

export const POST: APIRoute = async ({ request }) => {
  try {
    // Get raw body for signature verification
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      logger.warn('Webhook received without signature');
      return new Response('No signature provided', { status: 400 });
    }

    // Verify webhook signature
    const event = verifyWebhookSignature(body, signature);

    if (!event) {
      logger.warn('Webhook signature verification failed');
      return new Response('Signature verification failed', { status: 401 });
    }

    logger.info('Webhook event received', { eventId: event.id, eventType: event.type });

    // Handle the webhook event
    const handled = await handleWebhookEvent(event);

    if (!handled) {
      logger.error('Webhook event handling failed', new Error(`Failed to handle event ${event.id}`), { eventType: event.type });
      return new Response('Event handling failed', { status: 500 });
    }

    logger.info('Webhook event processed successfully', { eventId: event.id });
    return new Response('Webhook processed', { status: 200 });
  } catch (error) {
    logger.error('Webhook error', error instanceof Error ? error : new Error(String(error)));
    return new Response('Webhook error', { status: 500 });
  }
};
