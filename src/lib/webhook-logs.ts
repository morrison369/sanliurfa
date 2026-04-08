import type { Pool } from 'pg';

export interface WebhookLog {
  id: string;
  webhookId: string;
  event: string;
  status: string;
  responseCode?: number;
  responseTime?: number;
  errorMessage?: string;
  attempts: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Get webhook delivery logs
 */
export async function getWebhookLogs(
  pool: Pool,
  webhookId: string,
  userId: string,
  limit = 50,
  offset = 0
): Promise<{ logs: WebhookLog[]; total: number }> {
  try {
    // Get total count
    const countRes = await pool.query(
      `SELECT COUNT(*) as count FROM webhook_events we
       JOIN webhooks w ON we.webhook_id = w.id
       WHERE we.webhook_id = $1 AND w.user_id = $2`,
      [webhookId, userId]
    );

    // Get paginated logs
    const logsRes = await pool.query(
      `SELECT
        we.id,
        we.webhook_id,
        we.event,
        we.status,
        we.response_code,
        we.delivery_time_ms as response_time,
        we.error_message,
        we.attempts,
        we.created_at,
        we.updated_at
       FROM webhook_events we
       JOIN webhooks w ON we.webhook_id = w.id
       WHERE we.webhook_id = $1 AND w.user_id = $2
       ORDER BY we.created_at DESC
       LIMIT $3 OFFSET $4`,
      [webhookId, userId, limit, offset]
    );

    return {
      logs: logsRes.rows,
      total: parseInt(countRes.rows[0].count)
    };
  } catch (error) {
    console.error('Error getting webhook logs:', error);
    throw error;
  }
}

/**
 * Get webhook log details
 */
export async function getWebhookLogDetail(
  pool: Pool,
  logId: string,
  userId: string
): Promise<WebhookLog | null> {
  try {
    const result = await pool.query(
      `SELECT
        we.id,
        we.webhook_id,
        we.event,
        we.status,
        we.response_code,
        we.delivery_time_ms as response_time,
        we.error_message,
        we.attempts,
        we.created_at,
        we.updated_at,
        we.data,
        we.response_body
       FROM webhook_events we
       JOIN webhooks w ON we.webhook_id = w.id
       WHERE we.id = $1 AND w.user_id = $2`,
      [logId, userId]
    );

    return result.rows[0] || null;
  } catch (error) {
    console.error('Error getting webhook log detail:', error);
    throw error;
  }
}

/**
 * Get webhook logs summary
 */
export async function getWebhookLogsSummary(
  pool: Pool,
  webhookId: string,
  userId: string,
  hours = 24
): Promise<{
  total: number;
  delivered: number;
  failed: number;
  pending: number;
  successRate: number;
  avgResponseTime: number;
}> {
  try {
    const result = await pool.query(
      `SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as delivered,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        AVG(delivery_time_ms) as avg_response_time
       FROM webhook_events we
       JOIN webhooks w ON we.webhook_id = w.id
       WHERE we.webhook_id = $1 AND w.user_id = $2
       AND we.created_at > NOW() - INTERVAL '1 hour' * $3`,
      [webhookId, userId, hours]
    );

    const row = result.rows[0];
    const total = parseInt(row.total);
    const delivered = parseInt(row.delivered) || 0;
    const failed = parseInt(row.failed) || 0;
    const pending = parseInt(row.pending) || 0;
    const successRate = total > 0 ? (delivered / total) * 100 : 0;

    return {
      total,
      delivered,
      failed,
      pending,
      successRate: Math.round(successRate * 100) / 100,
      avgResponseTime: parseInt(row.avg_response_time) || 0
    };
  } catch (error) {
    console.error('Error getting webhook logs summary:', error);
    throw error;
  }
}

/**
 * Clear old webhook logs
 */
export async function clearOldWebhookLogs(
  pool: Pool,
  webhookId: string,
  userId: string,
  daysOld = 30
): Promise<number> {
  try {
    const result = await pool.query(
      `DELETE FROM webhook_events
       WHERE webhook_id = $1 AND webhook_id IN
       (SELECT id FROM webhooks WHERE user_id = $2)
       AND created_at < NOW() - INTERVAL '1 day' * $3`,
      [webhookId, userId, daysOld]
    );

    return result.rowCount || 0;
  } catch (error) {
    console.error('Error clearing webhook logs:', error);
    throw error;
  }
}
