import { Pool } from 'pg';
import { triggerWebhook } from './webhooks';

export interface ReplayRequest {
  id: string;
  webhookId: string;
  eventId: string;
  status: 'pending' | 'completed' | 'failed';
  eventType: string;
  eventData: any;
  requestedAt: string;
  completedAt?: string;
  errorMessage?: string;
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

    // Create replay request
    const replayRes = await pool.query(
      `INSERT INTO webhook_replays
        (webhook_id, event_id, event_type, event_data, status)
       VALUES ($1, $2, $3, $4, 'pending')
       RETURNING id, webhook_id, event_id, status, event_type, event_data, requested_at`,
      [webhookId, eventId, event.event, event.data]
    );

    return {
      id: replayRes.rows[0].id,
      webhookId: replayRes.rows[0].webhook_id,
      eventId: replayRes.rows[0].event_id,
      status: replayRes.rows[0].status,
      eventType: replayRes.rows[0].event_type,
      eventData: replayRes.rows[0].event_data,
      requestedAt: replayRes.rows[0].requested_at
    };
  } catch (error) {
    console.error('Error requesting event replay:', error);
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
      `SELECT id, webhook_id, event_type, event_data, event_id
       FROM webhook_replays
       WHERE status = 'pending'
       LIMIT $1`,
      [maxCount]
    );

    let processedCount = 0;

    for (const replay of pendingRes.rows) {
      try {
        // Trigger the event
        await triggerWebhook(replay.event_type, replay.event_data, '');

        // Mark as completed
        await pool.query(
          `UPDATE webhook_replays
           SET status = 'completed', completed_at = NOW()
           WHERE id = $1`,
          [replay.id]
        );

        processedCount++;
      } catch (error) {
        // Mark as failed
        await pool.query(
          `UPDATE webhook_replays
           SET status = 'failed', error_message = $1, completed_at = NOW()
           WHERE id = $2`,
          [String(error), replay.id]
        );
      }
    }

    return processedCount;
  } catch (error) {
    console.error('Error processing replays:', error);
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
    console.error('Error getting replay history:', error);
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
    console.error('Error canceling replay:', error);
    throw error;
  }
}
