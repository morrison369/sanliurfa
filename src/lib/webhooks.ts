/**
 * Webhook Sistemi - Dis servislere bildirim gonderme
 */

import crypto from 'crypto';
import { pool } from './postgres';
import { logger } from './logging';

export type WebhookEvent =
  | 'place.created'
  | 'place.updated'
  | 'place.deleted'
  | 'review.created'
  | 'review.deleted'
  | 'blog.published'
  | 'event.created'
  | 'user.registered';

export interface WebhookPayload {
  event: WebhookEvent;
  timestamp: string;
  data: Record<string, any>;
}

/**
 * Webhook'u kaydet
 */
export async function createWebhook(
  userId: string,
  name: string,
  url: string,
  events: WebhookEvent[]
): Promise<string | null> {
  try {
    const secret = crypto.randomBytes(32).toString('hex');

    const result = await pool.query(
      `INSERT INTO webhooks (user_id, name, url, events, secret)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id`,
      [userId, name, url, events, secret]
    );

    const webhookId = result.rows[0]?.id;
    logger.info('Webhook olusturuldu', { webhookId, userId, url });

    return webhookId;
  } catch (error) {
    logger.error('Webhook olusturulurken hata', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

/**
 * Webhook'u sil
 */
export async function deleteWebhook(webhookId: string, userId: string): Promise<boolean> {
  try {
    const result = await pool.query(
      `DELETE FROM webhooks WHERE id = $1 AND user_id = $2`,
      [webhookId, userId]
    );

    return (result.rowCount || 0) > 0;
  } catch (error) {
    logger.error('Webhook silinirken hata', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

/**
 * Kullanıcının webhooks'larını al
 */
export async function getUserWebhooks(userId: string): Promise<any[]> {
  try {
    const result = await pool.query(
      `SELECT id, name, url, events, active, created_at
      FROM webhooks
      WHERE user_id = $1
      ORDER BY created_at DESC`,
      [userId]
    );

    return result.rows;
  } catch (error) {
    logger.error('Webhooks alınırken hata', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

/**
 * Event için uygun webhooks'ları bul
 */
async function getWebhooksForEvent(event: WebhookEvent): Promise<any[]> {
  try {
    const result = await pool.query(
      `SELECT id, url, secret, retry_count, timeout_ms
      FROM webhooks
      WHERE active = true AND $1 = ANY(events)`,
      [event]
    );

    return result.rows;
  } catch (error) {
    logger.error('Event webhooks bulunurken hata', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

/**
 * Webhook payload'ı imzala (HMAC-SHA256)
 */
function signPayload(payload: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

/**
 * Webhook'u gonder
 */
async function deliverWebhook(webhook: any, payload: WebhookPayload): Promise<void> {
  const payloadJson = JSON.stringify(payload);
  const signature = signPayload(payloadJson, webhook.secret);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), webhook.timeout_ms);

    const response = await fetch(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
        'X-Webhook-Event': payload.event
      },
      body: payloadJson,
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    const responseBody = await response.text();
    const statusCode = response.status;
    const success = statusCode >= 200 && statusCode < 300;

    // Delivery'i kaydet
    await pool.query(
      `INSERT INTO webhook_deliveries
      (webhook_id, event_type, payload, status_code, response_body, delivered_at)
      VALUES ($1, $2, $3, $4, $5, NOW())`,
      [webhook.id, payload.event, JSON.stringify(payload), statusCode, responseBody]
    );

    if (success) {
      logger.debug('Webhook gonderimi basarili', {
        webhookId: webhook.id,
        event: payload.event,
        statusCode
      });
    } else {
      await scheduleRetry(webhook, payload);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Delivery'i kaydet (basarisiz)
    await pool.query(
      `INSERT INTO webhook_deliveries
      (webhook_id, event_type, payload, error_message)
      VALUES ($1, $2, $3, $4)`,
      [webhook.id, payload.event, JSON.stringify(payload), errorMessage]
    );

    await scheduleRetry(webhook, payload);

    logger.warn('Webhook gonderimi basarisiz', {
      webhookId: webhook.id,
      event: payload.event,
      error: errorMessage
    });
  }
}

/**
 * Retry planla
 */
async function scheduleRetry(webhook: any, payload: WebhookPayload): Promise<void> {
  try {
    const result = await pool.query(
      `SELECT attempts FROM webhook_deliveries
      WHERE webhook_id = $1 AND event_type = $2
      ORDER BY created_at DESC LIMIT 1`,
      [webhook.id, payload.event]
    );

    const attempts = (result.rows[0]?.attempts || 0) + 1;

    if (attempts < webhook.retry_count) {
      const delaySeconds = Math.min(5 * Math.pow(3, attempts - 1), 3600);

      await pool.query(
        `UPDATE webhook_deliveries
        SET attempts = $1, next_retry_at = NOW() + INTERVAL '${delaySeconds} seconds'
        WHERE webhook_id = $2 AND event_type = $3
        ORDER BY created_at DESC LIMIT 1`,
        [attempts, webhook.id, payload.event]
      );

      logger.debug('Webhook retry planland', {
        webhookId: webhook.id,
        event: payload.event,
        attemptNumber: attempts,
        delaySeconds
      });
    }
  } catch (error) {
    logger.error('Webhook retry planlanırken hata', error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Event yayinla
 */
export async function publishEvent(event: WebhookEvent, data: Record<string, any>): Promise<void> {
  try {
    const webhooks = await getWebhooksForEvent(event);

    if (webhooks.length === 0) {
      return;
    }

    const payload: WebhookPayload = {
      event,
      timestamp: new Date().toISOString(),
      data
    };

    // Tüm webhooks'a gonder (asynchronous)
    for (const webhook of webhooks) {
      deliverWebhook(webhook, payload).catch(err => {
        logger.error('Webhook gonderiminde hata', err instanceof Error ? err : new Error(String(err)));
      });
    }

    logger.debug('Event yayinlandi', {
      event,
      webhookCount: webhooks.length
    });
  } catch (error) {
    logger.error('Event yayinlanırken hata', error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Basarisiz deliveries'i retry etmeyi dene
 */
export async function retryFailedDeliveries(): Promise<number> {
  try {
    const result = await pool.query(
      `SELECT wd.id, wd.webhook_id, wd.event_type, wd.payload,
              w.url, w.secret, w.retry_count, w.timeout_ms
      FROM webhook_deliveries wd
      JOIN webhooks w ON wd.webhook_id = w.id
      WHERE wd.delivered_at IS NULL
      AND wd.next_retry_at <= NOW()
      AND wd.attempts < w.retry_count
      LIMIT 10`
    );

    const deliveries = result.rows;

    for (const delivery of deliveries) {
      const payload = JSON.parse(delivery.payload);
      await deliverWebhook(
        {
          id: delivery.webhook_id,
          url: delivery.url,
          secret: delivery.secret,
          retry_count: delivery.retry_count,
          timeout_ms: delivery.timeout_ms
        },
        payload
      );
    }

    return deliveries.length;
  } catch (error) {
    logger.error('Basarisiz deliveries retry hata', error instanceof Error ? error : new Error(String(error)));
    return 0;
  }
}

/**
 * Webhook delivery gecmisi
 */
export async function getWebhookDeliveries(webhookId: string, limit: number = 50): Promise<any[]> {
  try {
    const result = await pool.query(
      `SELECT id, event_type, status_code, error_message, delivered_at, attempts, created_at
      FROM webhook_deliveries
      WHERE webhook_id = $1
      ORDER BY created_at DESC
      LIMIT $2`,
      [webhookId, limit]
    );

    return result.rows;
  } catch (error) {
    logger.error('Webhook deliveries alınırken hata', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}
