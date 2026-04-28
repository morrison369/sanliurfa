/**
 * Webhook System
 * Outgoing webhook management for third-party integrations
 */

import { query } from '../postgres';
import crypto from 'crypto';
import { safeErrorDetail } from '../api';

export interface Webhook {
  id: string;
  user_id: string;
  url: string;
  secret: string;
  events: string[];
  status: 'active' | 'paused' | 'disabled';
  retry_count: number;
  created_at: Date;
  last_triggered?: Date;
}

export interface WebhookDelivery {
  id: string;
  webhook_id: string;
  event: string;
  payload: any;
  response_status?: number;
  response_body?: string;
  error?: string;
  delivered_at?: Date;
  retry_count: number;
}

const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 5000, 15000]; // ms
let webhookColumnsCache: Set<string> | null = null;

async function getWebhookColumns(): Promise<Set<string>> {
  if (webhookColumnsCache) return webhookColumnsCache;
  try {
    const res = await query(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'webhooks'`,
    );
    webhookColumnsCache = new Set(res.rows.map((r: any) => String(r.column_name)));
  } catch {
    webhookColumnsCache = new Set();
  }
  return webhookColumnsCache;
}

/**
 * Create webhook
 */
export async function createWebhook(
  userId: string,
  url: string,
  events: string[]
): Promise<{ webhook?: Webhook; error?: string }> {
  try {
    // Validate URL
    new URL(url);

    // Generate secret for signature
    const secret = crypto.randomBytes(32).toString('hex');

    const result = await query(
      `INSERT INTO webhooks (user_id, url, secret, events, status, retry_count, created_at)
       VALUES ($1, $2, $3, $4, 'active', 0, NOW())
       RETURNING *`,
      [userId, url, secret, events]
    );

    const row = result.rows[0];
    return {
      webhook: {
        id: row.id,
        user_id: row.user_id,
        url: row.url,
        secret: row.secret,
        events: row.events,
        status: row.status,
        retry_count: row.retry_count,
        created_at: new Date(row.created_at),
      },
    };
  } catch (error) {
    return { error: safeErrorDetail(error, 'Webhook oluşturulamadı') };
  }
}

/**
 * Get webhooks for user
 */
export async function getWebhooks(userId: string): Promise<Webhook[]> {
  const result = await query(
    `SELECT id, user_id, url, secret, events, status, retry_count, created_at, last_triggered
     FROM webhooks
     WHERE user_id = $1
     ORDER BY created_at DESC`,
    [userId]
  );

  return result.rows.map(row => ({
    id: row.id,
    user_id: row.user_id,
    url: row.url,
    secret: row.secret,
    events: row.events,
    status: row.status,
    retry_count: row.retry_count,
    created_at: new Date(row.created_at),
    last_triggered: row.last_triggered ? new Date(row.last_triggered) : undefined,
  }));
}

/**
 * Delete webhook
 */
export async function deleteWebhook(webhookId: string, userId: string): Promise<boolean> {
  const result = await query(
    'DELETE FROM webhooks WHERE id = $1 AND user_id = $2',
    [webhookId, userId]
  );
  return result.rowCount > 0;
}

/**
 * Trigger webhook
 */
export async function triggerWebhook(
  event: string,
  payload: any,
  userId?: string
): Promise<void> {
  const cols = await getWebhookColumns();
  const activePredicate = cols.has('status')
    ? "status = 'active'"
    : cols.has('is_active')
      ? 'is_active = true'
      : cols.has('active')
        ? 'active = true'
        : '1=1';
  const eventPredicate = cols.has('events')
    ? '$1 = ANY(events)'
    : cols.has('event')
      ? 'event = $1'
      : '1=1';

  // Find active webhooks for this event (schema-compat mode)
  let sql = `SELECT * FROM webhooks WHERE ${activePredicate} AND ${eventPredicate}`;
  const params: any[] = [event];

  if (userId) {
    sql += ' AND user_id = $2';
    params.push(userId);
  }

  const webhooks = await query(sql, params);

  // Deliver to each webhook
  for (const webhook of webhooks.rows) {
    await deliverWebhook(webhook, event, payload);
  }
}

/**
 * Deliver webhook with retries
 */
async function deliverWebhook(
  webhook: any,
  event: string,
  payload: any,
  attempt = 0
): Promise<void> {
  const deliveryId = crypto.randomUUID();
  const timestamp = new Date().toISOString();

  // Create signature
  const signature = createWebhookSignature(webhook.secret, payload, timestamp);

  try {
    // Defense-in-depth SSRF check at fetch time.
    const { validateExternalUrl } = await import('../security/safe-url');
    const urlCheck = validateExternalUrl(webhook.url);
    if (!urlCheck.ok) {
      throw new Error(`unsafe_url:${urlCheck.reason}`);
    }

    const response = await fetch(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
        'X-Webhook-Event': event,
        'X-Webhook-Timestamp': timestamp,
        'X-Webhook-ID': deliveryId,
      },
      body: JSON.stringify({
        event,
        timestamp,
        data: payload,
      }),
    });

    const responseBody = await response.text();

    // Record delivery
    await query(
      `INSERT INTO webhook_deliveries (id, webhook_id, event, payload, response_status, response_body, delivered_at, retry_count)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7)`,
      [deliveryId, webhook.id, event, JSON.stringify(payload), response.status, responseBody, attempt]
    );

    // Update last triggered
    await query(
      'UPDATE webhooks SET last_triggered = NOW() WHERE id = $1',
      [webhook.id]
    );

    if (!response.ok && attempt < MAX_RETRIES) {
      // Retry
      setTimeout(() => {
        deliverWebhook(webhook, event, payload, attempt + 1);
      }, RETRY_DELAYS[attempt]);
    }
  } catch (error) {
    // Record failed delivery
    await query(
      `INSERT INTO webhook_deliveries (id, webhook_id, event, payload, error, retry_count)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [deliveryId, webhook.id, event, JSON.stringify(payload), error instanceof Error ? error.message : 'Unknown error', attempt]
    );

    if (attempt < MAX_RETRIES) {
      setTimeout(() => {
        deliverWebhook(webhook, event, payload, attempt + 1);
      }, RETRY_DELAYS[attempt]);
    }
  }
}

/**
 * Create webhook signature
 */
function createWebhookSignature(secret: string, payload: any, timestamp: string): string {
  const data = `${timestamp}.${JSON.stringify(payload)}`;
  return `sha256=${crypto.createHmac('sha256', secret).update(data).digest('hex')}`;
}

/**
 * Verify webhook signature
 */
export function verifyWebhookSignature(
  signature: string,
  secret: string,
  payload: any,
  timestamp: string
): boolean {
  const expected = createWebhookSignature(secret, payload, timestamp);
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

/**
 * Get webhook delivery logs
 */
export async function getWebhookDeliveries(
  webhookId: string,
  limit = 50
): Promise<WebhookDelivery[]> {
  const result = await query(
    `SELECT * FROM webhook_deliveries
     WHERE webhook_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [webhookId, limit]
  );

  return result.rows.map(row => ({
    id: row.id,
    webhook_id: row.webhook_id,
    event: row.event,
    payload: row.payload,
    response_status: row.response_status,
    response_body: row.response_body,
    error: row.error,
    delivered_at: row.delivered_at ? new Date(row.delivered_at) : undefined,
    retry_count: row.retry_count,
  }));
}

/**
 * Toggle webhook status
 */
export async function toggleWebhook(
  webhookId: string,
  userId: string,
  status: 'active' | 'paused'
): Promise<boolean> {
  const result = await query(
    'UPDATE webhooks SET status = $3 WHERE id = $1 AND user_id = $2',
    [webhookId, userId, status]
  );
  return result.rowCount > 0;
}
