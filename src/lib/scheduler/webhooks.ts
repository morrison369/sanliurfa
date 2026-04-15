/**
 * Scheduler: Webhook Retry Logic
 * Retries failed webhook deliveries with exponential backoff
 */

import { query } from '../postgres';
import { logger } from '../logger';
import crypto from 'crypto';

export interface WebhookDelivery {
  id: string;
  webhookId: string;
  eventType: string;
  payload: Record<string, any>;
  status: 'pending' | 'delivered' | 'failed';
  attempts: number;
  maxAttempts: number;
  lastAttemptAt?: Date;
  nextAttemptAt?: Date;
  responseStatus?: number;
  responseBody?: string;
}

/**
 * Get failed deliveries that are due for retry
 */
export async function getPendingDeliveries(): Promise<WebhookDelivery[]> {
  const result = await query(
    `SELECT wd.id, wd.webhook_id, wd.event_type, wd.payload, wd.attempts,
            w.retry_count as max_attempts, w.url, w.secret, w.timeout_ms
     FROM webhook_deliveries wd
     JOIN webhooks w ON w.id = wd.webhook_id
     WHERE wd.delivered_at IS NULL
       AND wd.error_message IS NOT NULL
       AND wd.attempts < w.retry_count
       AND (wd.next_retry_at IS NULL OR wd.next_retry_at <= NOW())
       AND w.active = true
     ORDER BY wd.created_at ASC
     LIMIT 50`
  );
  return result.rows.map((r: any) => ({
    id: r.id,
    webhookId: r.webhook_id,
    eventType: r.event_type,
    payload: r.payload,
    status: 'pending',
    attempts: r.attempts,
    maxAttempts: r.max_attempts,
    url: r.url,
    secret: r.secret,
    timeoutMs: r.timeout_ms || 5000,
  }));
}

/**
 * Send a single webhook delivery
 */
export async function sendWebhook(delivery: any): Promise<boolean> {
  const { url, secret, payload, eventType, timeoutMs } = delivery;

  const body = JSON.stringify(payload);
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = secret
    ? crypto.createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex')
    : undefined;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Webhook-Event': eventType,
    'X-Webhook-Timestamp': String(timestamp),
  };
  if (signature) headers['X-Webhook-Signature'] = `sha256=${signature}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs || 5000);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body,
      signal: controller.signal,
    });

    const responseBody = await response.text().catch(() => '');
    const success = response.status >= 200 && response.status < 300;

    // Exponential backoff: 1m, 5m, 30m, 2h, 8h
    const backoffMinutes = [1, 5, 30, 120, 480];
    const nextRetryMin = backoffMinutes[delivery.attempts] ?? null;
    const nextRetryAt = nextRetryMin
      ? new Date(Date.now() + nextRetryMin * 60_000).toISOString()
      : null;

    await query(
      `UPDATE webhook_deliveries SET
         attempts = attempts + 1,
         status_code = $2,
         response_body = $3,
         error_message = $4,
         next_retry_at = $5,
         delivered_at = $6
       WHERE id = $1`,
      [
        delivery.id,
        response.status,
        responseBody.slice(0, 2000),
        success ? null : `HTTP ${response.status}`,
        success ? null : nextRetryAt,
        success ? new Date().toISOString() : null,
      ]
    );

    return success;
  } catch (err: any) {
    const backoffMinutes = [1, 5, 30, 120, 480];
    const nextRetryMin = backoffMinutes[delivery.attempts] ?? null;
    const nextRetryAt = nextRetryMin
      ? new Date(Date.now() + nextRetryMin * 60_000).toISOString()
      : null;

    await query(
      `UPDATE webhook_deliveries SET
         attempts = attempts + 1,
         error_message = $2,
         next_retry_at = $3
       WHERE id = $1`,
      [delivery.id, err.message || 'Request failed', nextRetryAt]
    );
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Mark delivery as permanently failed (exceeded max attempts)
 */
export async function markDeliveryFailed(deliveryId: string, reason: string): Promise<void> {
  await query(
    `UPDATE webhook_deliveries SET error_message = $2, next_retry_at = NULL WHERE id = $1`,
    [deliveryId, reason]
  );
}

/**
 * Retry all due failed deliveries
 */
export async function retryFailedDeliveries(): Promise<{
  retried: number;
  succeeded: number;
  failed: number;
}> {
  let retried = 0, succeeded = 0, failed = 0;
  try {
    const deliveries = await getPendingDeliveries();
    retried = deliveries.length;
    for (const d of deliveries) {
      const ok = await sendWebhook(d);
      ok ? succeeded++ : failed++;
    }
    if (retried > 0) {
      logger.info('Webhook retry run complete', { retried, succeeded, failed });
    }
  } catch (err) {
    logger.error('Webhook retry error', { err });
  }
  return { retried, succeeded, failed };
}

export default { retryFailedDeliveries, getPendingDeliveries, sendWebhook, markDeliveryFailed };
