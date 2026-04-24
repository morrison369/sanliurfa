import type { APIRoute } from 'astro';
import { createHmac } from 'node:crypto';
import { query } from '../../../lib/postgres';
import { logger } from '../../../lib/logging';
import { problemJson } from '../../../lib/api';

// Webhook tetikleme endpoint'i
export const POST: APIRoute = async (context) => {
  try {
    const body = await context.request.json();
    const { event, payload, placeId } = body;

    if (!event || !payload) {
      return problemJson({
        status: 400,
        title: 'Geçersiz İstek',
        detail: 'event ve payload zorunludur',
        type: '/problems/webhook-trigger-validation',
        instance: '/api/webhooks/trigger',
      });
    }

    // İlgili webhook'ları bul
    const webhooksResult = await query(
      `SELECT w.* FROM webhooks w
       JOIN webhook_events we ON w.id = we.webhook_id
       WHERE we.event_type = $1 AND w.active = true
       ${placeId ? 'AND w.place_id = $2' : ''}`,
      placeId ? [event, placeId] : [event]
    );

    const webhooks = webhooksResult.rows;
    const results = [];

    // Her webhook'u asenkron olarak tetikle
    for (const webhook of webhooks) {
      try {
        const response = await fetch(webhook.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Signature': generateSignature(payload, webhook.secret_key),
            'X-Webhook-Event': event,
            'X-Webhook-ID': webhook.id
          },
          body: JSON.stringify({
            event,
            timestamp: new Date().toISOString(),
            data: payload
          })
        });

        // Log the attempt
        await query(
          `INSERT INTO webhook_logs (webhook_id, event_type, payload, response_status, response_body)
           VALUES ($1, $2, $3, $4, $5)`,
          [webhook.id, event, JSON.stringify(payload), response.status, await response.text()]
        );

        results.push({
          webhookId: webhook.id,
          status: response.status,
          success: response.ok
        });

      } catch (err) {
        const errMessage = err instanceof Error ? err.message : 'webhook_trigger_failed';
        // Log failure
        await query(
          `INSERT INTO webhook_logs (webhook_id, event_type, payload, error)
           VALUES ($1, $2, $3, $4)`,
          [webhook.id, event, JSON.stringify(payload), errMessage]
        );

        results.push({
          webhookId: webhook.id,
          error: errMessage,
          success: false
        });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      triggered: webhooks.length,
      results
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    logger.error('Webhook trigger error:', error);
    return problemJson({
      status: 500,
      title: 'Webhook Tetiklenemedi',
      detail: error instanceof Error ? error.message : 'server_error',
      type: '/problems/webhook-trigger-failed',
      instance: '/api/webhooks/trigger',
    });
  }
};

function generateSignature(payload: any, secret: string): string {
  return 'sha256=' + createHmac('sha256', secret || '')
    .update(JSON.stringify(payload))
    .digest('hex');
}
