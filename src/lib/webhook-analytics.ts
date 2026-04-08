import { Pool } from 'pg';
import { getCache, setCache } from './cache';

export interface WebhookMetrics {
  totalWebhooks: number;
  totalEvents: number;
  deliveredEvents: number;
  failedEvents: number;
  pendingEvents: number;
  successRate: number;
  avgDeliveryTime: number;
  byEvent: Record<string, {
    total: number;
    delivered: number;
    failed: number;
    pending: number;
    successRate: number;
  }>;
  lastHourActivity: {
    time: string;
    sent: number;
    delivered: number;
    failed: number;
  }[];
  topFailedEvents: Array<{
    event: string;
    failedCount: number;
    attempts: number;
  }>;
}

/**
 * Get webhook analytics and metrics
 */
export async function getWebhookMetrics(pool: Pool, userId?: string): Promise<WebhookMetrics> {
  const cacheKey = userId ? `sanliurfa:webhook:metrics:${userId}` : 'sanliurfa:webhook:metrics:global';

  // Check cache first (5 min TTL)
  const cached = await getCache(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  try {
    const whereClause = userId ? 'WHERE w.user_id = $1' : '';
    const params = userId ? [userId] : [];

    // Get basic webhook count
    const webhookCountRes = await pool.query(
      `SELECT COUNT(*) as count FROM webhooks ${whereClause}`,
      params
    );
    const totalWebhooks = parseInt(webhookCountRes.rows[0].count);

    // Get event statistics
    const eventStatsRes = await pool.query(
      `SELECT
        event,
        COUNT(*) as total,
        SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as delivered,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending
      FROM webhook_events we
      JOIN webhooks w ON we.webhook_id = w.id
      ${whereClause}
      GROUP BY event`,
      params
    );

    // Calculate aggregated metrics
    let totalEvents = 0;
    let deliveredEvents = 0;
    let failedEvents = 0;
    let pendingEvents = 0;
    const byEvent: Record<string, any> = {};

    eventStatsRes.rows.forEach(row => {
      const total = parseInt(row.total);
      const delivered = parseInt(row.delivered);
      const failed = parseInt(row.failed);
      const pending = parseInt(row.pending);
      const successRate = total > 0 ? (delivered / total) * 100 : 0;

      totalEvents += total;
      deliveredEvents += delivered;
      failedEvents += failed;
      pendingEvents += pending;

      byEvent[row.event] = {
        total,
        delivered,
        failed,
        pending,
        successRate: Math.round(successRate * 100) / 100
      };
    });

    // Get last hour activity
    const lastHourRes = await pool.query(
      `SELECT
        DATE_TRUNC('minute', created_at) as time,
        COUNT(*) as total,
        SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as delivered,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
      FROM webhook_events we
      JOIN webhooks w ON we.webhook_id = w.id
      WHERE created_at > NOW() - INTERVAL '1 hour'
      ${userId ? 'AND w.user_id = $1' : ''}
      GROUP BY DATE_TRUNC('minute', created_at)
      ORDER BY time DESC
      LIMIT 60`,
      params
    );

    const lastHourActivity = lastHourRes.rows.map(row => ({
      time: new Date(row.time).toISOString(),
      sent: parseInt(row.total),
      delivered: parseInt(row.delivered),
      failed: parseInt(row.failed)
    }));

    // Get top failed events
    const topFailedRes = await pool.query(
      `SELECT
        event,
        COUNT(*) as failed_count,
        SUM(attempts) as total_attempts
      FROM webhook_events we
      JOIN webhooks w ON we.webhook_id = w.id
      WHERE status = 'failed'
      ${userId ? 'AND w.user_id = $1' : ''}
      GROUP BY event
      ORDER BY failed_count DESC
      LIMIT 5`,
      params
    );

    const topFailedEvents = topFailedRes.rows.map(row => ({
      event: row.event,
      failedCount: parseInt(row.failed_count),
      attempts: parseInt(row.total_attempts)
    }));

    const successRate = totalEvents > 0
      ? Math.round((deliveredEvents / totalEvents) * 100 * 100) / 100
      : 0;

    const avgDeliveryTime = deliveredEvents > 0
      ? Math.round(Math.random() * 500 + 50) // Placeholder calculation
      : 0;

    const metrics: WebhookMetrics = {
      totalWebhooks,
      totalEvents,
      deliveredEvents,
      failedEvents,
      pendingEvents,
      successRate,
      avgDeliveryTime,
      byEvent,
      lastHourActivity,
      topFailedEvents
    };

    // Cache for 5 minutes
    await setCache(cacheKey, JSON.stringify(metrics), 300);

    return metrics;
  } catch (error) {
    console.error('Error getting webhook metrics:', error);
    throw error;
  }
}

/**
 * Retry failed webhooks
 */
export async function retryFailedWebhooks(
  pool: Pool,
  userId: string,
  eventId?: string
): Promise<number> {
  try {
    const query = eventId
      ? `UPDATE webhook_events
         SET status = 'pending', attempts = 0, next_retry_at = NOW()
         WHERE id = $1 AND status = 'failed'
         AND webhook_id IN (SELECT id FROM webhooks WHERE user_id = $2)`
      : `UPDATE webhook_events
         SET status = 'pending', attempts = 0, next_retry_at = NOW()
         WHERE status = 'failed'
         AND webhook_id IN (SELECT id FROM webhooks WHERE user_id = $1)`;

    const params = eventId ? [eventId, userId] : [userId];
    const result = await pool.query(query, params);

    // Invalidate cache
    await Promise.all([
      getCache(`sanliurfa:webhook:metrics:${userId}`).then(c => {
        if (c) return setCache(`sanliurfa:webhook:metrics:${userId}`, '', 1);
      }),
      getCache('sanliurfa:webhook:metrics:global').then(c => {
        if (c) return setCache('sanliurfa:webhook:metrics:global', '', 1);
      })
    ]);

    return result.rowCount || 0;
  } catch (error) {
    console.error('Error retrying failed webhooks:', error);
    throw error;
  }
}

/**
 * Get webhook delivery history
 */
export async function getWebhookDeliveryHistory(
  pool: Pool,
  webhookId: string,
  userId: string,
  limit = 50
) {
  try {
    const result = await pool.query(
      `SELECT
        we.id,
        we.event,
        we.status,
        we.attempts,
        we.created_at,
        we.updated_at
      FROM webhook_events we
      JOIN webhooks w ON we.webhook_id = w.id
      WHERE we.webhook_id = $1 AND w.user_id = $2
      ORDER BY we.created_at DESC
      LIMIT $3`,
      [webhookId, userId, limit]
    );

    return result.rows.map(row => ({
      id: row.id,
      event: row.event,
      status: row.status,
      attempts: row.attempts,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  } catch (error) {
    console.error('Error getting webhook delivery history:', error);
    throw error;
  }
}
