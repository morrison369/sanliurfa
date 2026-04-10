import type { Pool } from 'pg';
import { triggerWebhook } from './webhooks';
import {
  WEBHOOK_RETRY_MAX_ATTEMPTS,
  decideWebhookRetry,
  getWebhookNextRetryAt,
} from './webhook-delivery-policy';
import { logger } from './logging';

export interface ReplayRequest {
  id: string;
  webhookId: string;
  eventId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  eventType: string;
  eventData: any;
  requestedAt: string;
  completedAt?: string;
  errorMessage?: string;
  retryCount?: number;
  maxRetries?: number;
  nextRetryAt?: string;
}

/**
 * Request webhook event replay
 */
export async function requestEventReplay(
  pool: Pool,
  webhookId: string,
  eventId: string,
  userId: string
): Promise<ReplayRequest> {
  try {
    // Verify webhook and event ownership
    const eventRes = await pool.query(
      `SELECT we.id, we.event, we.data
       FROM webhook_events we
       JOIN webhooks w ON we.webhook_id = w.id
       WHERE we.id = $1 AND w.id = $2 AND w.user_id = $3`,
      [eventId, webhookId, userId]
    );

    if (eventRes.rows.length === 0) {
      throw new Error('Event not found');
    }

    const event = eventRes.rows[0];

    // Idempotency guard: avoid duplicate replay queue for same event+webhook.
    const existingReplay = await pool.query(
      `SELECT id, webhook_id, event_id, status, event_type, event_data, requested_at, completed_at, error_message, retry_count, max_retries, next_retry_at
       FROM webhook_replays
       WHERE webhook_id = $1 AND event_id = $2
       AND status IN ('pending', 'completed')
       ORDER BY requested_at DESC
       LIMIT 1`,
      [webhookId, eventId]
    );

    if (existingReplay.rows.length > 0) {
      const replay = existingReplay.rows[0];
      return {
        id: replay.id,
        webhookId: replay.webhook_id,
        eventId: replay.event_id,
        status: replay.status,
        eventType: replay.event_type,
        eventData: replay.event_data,
        requestedAt: replay.requested_at,
        completedAt: replay.completed_at || undefined,
        errorMessage: replay.error_message || undefined,
        retryCount: Number(replay.retry_count ?? 0),
        maxRetries: Number(replay.max_retries ?? WEBHOOK_RETRY_MAX_ATTEMPTS),
        nextRetryAt: replay.next_retry_at || undefined,
      };
    }

    // Create replay request
    const replayRes = await pool.query(
      `INSERT INTO webhook_replays
        (webhook_id, event_id, event_type, event_data, status, retry_count, max_retries)
       VALUES ($1, $2, $3, $4, 'pending', 0, $5)
       RETURNING id, webhook_id, event_id, status, event_type, event_data, requested_at, retry_count, max_retries, next_retry_at`,
      [webhookId, eventId, event.event, event.data, WEBHOOK_RETRY_MAX_ATTEMPTS]
    );

    return {
      id: replayRes.rows[0].id,
      webhookId: replayRes.rows[0].webhook_id,
      eventId: replayRes.rows[0].event_id,
      status: replayRes.rows[0].status,
      eventType: replayRes.rows[0].event_type,
      eventData: replayRes.rows[0].event_data,
      requestedAt: replayRes.rows[0].requested_at,
      retryCount: Number(replayRes.rows[0].retry_count ?? 0),
      maxRetries: Number(replayRes.rows[0].max_retries ?? WEBHOOK_RETRY_MAX_ATTEMPTS),
      nextRetryAt: replayRes.rows[0].next_retry_at || undefined,
    };
  } catch (error) {
    logger.error('Error requesting event replay', error instanceof Error ? error : new Error(String(error)), {
      webhookId,
      eventId,
      userId
    });
    throw error;
  }
}

/**
 * Process pending replay requests
 */
export async function processPendingReplays(
  pool: Pool,
  maxCount = 100
): Promise<number> {
  try {
    const pendingRes = await pool.query(
      `SELECT id, webhook_id, event_type, event_data, event_id, retry_count, max_retries, last_tried_at, next_retry_at
       FROM webhook_replays
       WHERE status IN ('pending', 'failed')
       AND (next_retry_at IS NULL OR next_retry_at <= NOW())
       AND COALESCE(retry_count, 0) < COALESCE(max_retries, $2)
       LIMIT $1`,
      [maxCount, WEBHOOK_RETRY_MAX_ATTEMPTS]
    );

    let processedCount = 0;

    for (const replay of pendingRes.rows) {
      const retryDecision = decideWebhookRetry({
        status: replay.status,
        retry_count: replay.retry_count,
        last_tried_at: replay.last_tried_at,
      });

      if (!retryDecision.shouldProcess) {
        continue;
      }

      try {
        await pool.query(
          `UPDATE webhook_replays
           SET status = 'processing', last_tried_at = NOW()
           WHERE id = $1`,
          [replay.id]
        );

        // Trigger the event
        await triggerWebhook(replay.event_type, replay.event_data, '');

        // Mark as completed
        await pool.query(
          `UPDATE webhook_replays
           SET status = 'completed', completed_at = NOW(), last_tried_at = NOW(), next_retry_at = NULL
           WHERE id = $1`,
          [replay.id]
        );

        processedCount++;
      } catch (error) {
        const nextRetryCount = Number(replay.retry_count || 0) + 1;
        const maxRetries = Number(replay.max_retries || WEBHOOK_RETRY_MAX_ATTEMPTS);
        const isExhausted = nextRetryCount >= maxRetries;
        const nextRetryAt = isExhausted ? null : getWebhookNextRetryAt(nextRetryCount);

        // Mark as failed
        await pool.query(
          `UPDATE webhook_replays
           SET status = 'failed',
               retry_count = $1,
               error_message = $2,
               next_retry_at = $3,
               completed_at = CASE WHEN $4 THEN NOW() ELSE NULL END,
               last_tried_at = NOW()
           WHERE id = $5`,
          [nextRetryCount, String(error), nextRetryAt ? nextRetryAt.toISOString() : null, isExhausted, replay.id]
        );
      }
    }

    return processedCount;
  } catch (error) {
    logger.error('Error processing replays', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Get replay history
 */
export async function getReplayHistory(
  pool: Pool,
  webhookId: string,
  userId: string,
  limit = 50
) {
  try {
    const result = await pool.query(
      `SELECT wr.id, wr.webhook_id, wr.event_id, wr.status,
              wr.event_type, wr.requested_at, wr.completed_at, wr.error_message
       FROM webhook_replays wr
       JOIN webhooks w ON wr.webhook_id = w.id
       WHERE wr.webhook_id = $1 AND w.user_id = $2
       ORDER BY wr.requested_at DESC
       LIMIT $3`,
      [webhookId, userId, limit]
    );

    return result.rows;
  } catch (error) {
    logger.error('Error getting replay history', error instanceof Error ? error : new Error(String(error)), {
      webhookId,
      userId
    });
    throw error;
  }
}

/**
 * Cancel pending replay
 */
export async function cancelReplay(
  pool: Pool,
  replayId: string,
  userId: string
): Promise<boolean> {
  try {
    const result = await pool.query(
      `DELETE FROM webhook_replays
       WHERE id = $1 AND webhook_id IN
       (SELECT id FROM webhooks WHERE user_id = $2)
       AND status = 'pending'`,
      [replayId, userId]
    );

    return (result.rowCount || 0) > 0;
  } catch (error) {
    logger.error('Error canceling replay', error instanceof Error ? error : new Error(String(error)), {
      replayId,
      userId
    });
    throw error;
  }
}
