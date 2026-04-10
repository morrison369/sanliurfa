/**
 * Stripe Webhook Handler
 * Receives and processes Stripe webhook events
 */

import type { APIRoute } from 'astro';
import { POST as canonicalStripeWebhookPost } from '../webhooks/stripe';
import { logger } from '../../../lib/logging';
import { recordRequest } from '../../../lib/metrics';
import { HttpStatus, getRequestId } from '../../../lib/api';

export const POST: APIRoute = async ({ request }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    logger.info('Legacy billing webhook endpoint invoked; canonical ingestion is /api/webhooks/stripe');
    const canonicalResponse = await canonicalStripeWebhookPost({ request } as any);
    const response = new Response(canonicalResponse.body, {
      status: canonicalResponse.status,
      headers: canonicalResponse.headers
    });
    response.headers.set('X-Webhook-Endpoint', 'legacy-billing-proxy');
    response.headers.set('X-Webhook-Canonical', '/api/webhooks/stripe');
    recordRequest('POST', '/api/billing/webhook', response.status, Date.now() - startTime);
    return response;
  } catch (error) {
    logger.error('Webhook error', error instanceof Error ? error : new Error(String(error)));
    recordRequest('POST', '/api/billing/webhook', HttpStatus.INTERNAL_SERVER_ERROR, Date.now() - startTime);
    return new Response(
      JSON.stringify({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Webhook error'
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId
        }
      }),
      {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': requestId
        }
      }
    );
  }
};
