import type { APIRoute } from 'astro';
import { createHmac } from 'node:crypto';
import { query } from '../../../lib/postgres';
import { logger } from '../../../lib/logging';
import { apiResponse, problemJson, HttpStatus, safeErrorDetail } from '../../../lib/api';
import { verifyInternalToken } from '../../../lib/auth/internal-token';
import { validateExternalUrl } from '../../../lib/security/safe-url';

// Webhook tetikleme endpoint'i — internal-only (cron/service-to-service).
// INTERNAL_API_TOKEN gerektirir; aksi halde anonim kullanıcı SSRF + customer webhook spam yapabilir.
export const POST: APIRoute = async (context) => {
  try {
    const authResult = verifyInternalToken(context.request);
    if (!authResult.ok) {
      logger.warn('Webhook trigger call rejected', { reason: authResult.reason });
      return problemJson({
        status: 401,
        title: 'Unauthorized',
        detail: 'Internal API token required',
        type: '/problems/webhook-trigger-unauthorized',
        instance: '/api/webhooks/trigger',
      });
    }

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
        // Defense-in-depth SSRF check at fetch time — DB row may have predated
        // registration-time validation, or admin may have bypassed it.
        const urlCheck = validateExternalUrl(webhook.url);
        if (!urlCheck.ok) {
          logger.warn('Webhook fetch skipped: unsafe URL', {
            webhookId: webhook.id,
            reason: urlCheck.reason,
          });
          await query(
            `INSERT INTO webhook_logs (webhook_id, event_type, payload, error)
             VALUES ($1, $2, $3, $4)`,
            [webhook.id, event, JSON.stringify(payload), `unsafe_url:${urlCheck.reason}`]
          );
          results.push({ webhookId: webhook.id, error: `unsafe_url:${urlCheck.reason}`, success: false });
          continue;
        }

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
        const rawErrMessage = err instanceof Error ? err.message : 'webhook_trigger_failed';
        await query(
          `INSERT INTO webhook_logs (webhook_id, event_type, payload, error)
           VALUES ($1, $2, $3, $4)`,
          [webhook.id, event, JSON.stringify(payload), rawErrMessage]
        );

        results.push({
          webhookId: webhook.id,
          error: safeErrorDetail(err, 'webhook_trigger_failed'),
          success: false
        });
      }
    }

    return apiResponse({
      success: true,
      triggered: webhooks.length,
      results
    }, HttpStatus.OK);

  } catch (error) {
    logger.error('Webhook trigger error:', error);
    return problemJson({
      status: 500,
      title: 'Webhook Tetiklenemedi',
      detail: safeErrorDetail(error, 'Webhook tetikleme başarısız oldu'),
      type: '/problems/webhook-trigger-failed',
      instance: '/api/webhooks/trigger',
    });
  }
};

function generateSignature(payload: unknown, secret: string): string {
  return 'sha256=' + createHmac('sha256', secret || '')
    .update(JSON.stringify(payload))
    .digest('hex');
}
