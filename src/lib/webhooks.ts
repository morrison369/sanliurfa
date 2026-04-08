/**
 * Webhook System
 * Event-driven webhooks for external integrations
 */

import { query, queryOne, insert, queryMany } from './postgres';
import { logger } from './logging';

export interface WebhookEvent {
  id: string;
  userId: string;
  event: string;
  data: Record<string, any>;
  timestamp: string;
  status: 'pending' | 'delivered' | 'failed';
  attempts: number;
  nextRetryAt?: string;
}

export interface Webhook {
  id: string;
  userId: string;
  url: string;
  event: string;
  active: boolean;
  secret?: string;
  createdAt: string;
  lastTriggeredAt?: string;
}

/**
 * Register a webhook
 */
export async function registerWebhook(
  userId: string,
  event: string,
  url: string,
  secret?: string
): Promise<Webhook> {
  try {
    const webhook = await insert('webhooks', {
      user_id: userId,
      event,
      url,
      secret: secret || null,
      active: true
    });

    logger.info('Webhook registered', { userId, event, url });
    return webhook;
  } catch (error) {
    logger.error('Failed to register webhook', error instanceof Error ? error : new Error(String(error)), {
      userId,
      event
    });
    throw error;
  }
}

/**
 * Trigger webhook event
 */
export async function triggerWebhook(event: string, data: Record<string, any>, userId: string): Promise<void> {
  try {
    // Find webhooks for this event
    const webhooks = await queryMany(
      'SELECT * FROM webhooks WHERE event = $1 AND user_id = $2 AND active = true',
      [event, userId]
    );

    if (webhooks.rows.length === 0) {
      return;
    }

    // Create event records and queue for delivery
    for (const webhook of webhooks.rows) {
      await insert('webhook_events', {
        webhook_id: webhook.id,
        event,
        data: JSON.stringify(data),
        status: 'pending',
        attempts: 0
      });
    }

    logger.info('Webhook event queued', { event, count: webhooks.rows.length });
  } catch (error) {
    logger.error('Failed to trigger webhook', error instanceof Error ? error : new Error(String(error)), {
      event,
      userId
    });
  }
}

/**
 * Process pending webhook events (call from background job)
 */
export async function processPendingWebhooks(maxRetries: number = 3): Promise<void> {
  try {
    const pendingEvents = await queryMany(
      `SELECT we.*, w.url, w.secret
       FROM webhook_events we
       JOIN webhooks w ON we.webhook_id = w.id
       WHERE we.status = 'pending' OR (we.status = 'failed' AND we.attempts < $1)
       ORDER BY we.created_at ASC
       LIMIT 100`,
      [maxRetries]
    );

    for (const event of pendingEvents.rows) {
      await deliverWebhook(event);
    }
  } catch (error) {
    logger.error('Failed to process webhooks', error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Deliver webhook to endpoint
 */
async function deliverWebhook(event: any): Promise<void> {
  try {
    const response = await fetch(event.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': generateSignature(event.data, event.secret)
      },
      body: event.data,
      timeout: 5000
    });

    if (response.ok) {
      await query(
        'UPDATE webhook_events SET status = $1, updated_at = NOW() WHERE id = $2',
        ['delivered', event.id]
      );
      logger.info('Webhook delivered', { webhookId: event.webhook_id });
    } else {
      throw new Error(`HTTP ${response.status}`);
    }
  } catch (error) {
    const attempts = event.attempts + 1;
    const nextRetryAt = new Date(Date.now() + Math.pow(2, attempts) * 60000);

    await query(
      `UPDATE webhook_events
       SET status = $1, attempts = $2, next_retry_at = $3, updated_at = NOW()
       WHERE id = $4`,
      ['failed', attempts, nextRetryAt.toISOString(), event.id]
    );

    logger.warn('Webhook delivery failed', error instanceof Error ? error : new Error(String(error)), {
      webhookId: event.webhook_id,
      attempts
    });
  }
}

/**
 * Generate HMAC signature for webhook
 */
function generateSignature(data: string, secret?: string): string {
  if (!secret) return '';

  const crypto = require('crypto');
  return crypto
    .createHmac('sha256', secret)
    .update(data)
    .digest('hex');
}

/**
 * List user's webhooks
 */
export async function getUserWebhooks(userId: string): Promise<Webhook[]> {
  try {
    const webhooks = await queryMany(
      'SELECT * FROM webhooks WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );

    return webhooks.rows;
  } catch (error) {
    logger.error('Failed to get user webhooks', error instanceof Error ? error : new Error(String(error)), {
      userId
    });
    throw error;
  }
}

/**
 * Delete webhook
 */
export async function deleteWebhook(userId: string, webhookId: string): Promise<boolean> {
  try {
    await query(
      'DELETE FROM webhooks WHERE id = $1 AND user_id = $2',
      [webhookId, userId]
    );

    logger.info('Webhook deleted', { userId, webhookId });
    return true;
  } catch (error) {
    logger.error('Failed to delete webhook', error instanceof Error ? error : new Error(String(error)), {
      userId,
      webhookId
    });
    throw error;
  }
}
