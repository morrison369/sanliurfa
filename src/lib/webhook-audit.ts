import type { Pool } from 'pg';

export interface AuditLog {
  id: string;
  webhookId: string;
  userId: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  changes: any;
  metadata: any;
  createdAt: string;
}

/**
 * Log webhook action
 */
export async function logWebhookAction(
  pool: Pool,
  webhookId: string,
  userId: string,
  action: string,
  resourceType: string,
  resourceId: string | null,
  changes: any = {},
  metadata: any = {}
): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO webhook_audit_logs
        (webhook_id, user_id, action, resource_type, resource_id, changes, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        webhookId,
        userId,
        action,
        resourceType,
        resourceId,
        JSON.stringify(changes),
        JSON.stringify(metadata)
      ]
    );
  } catch (error) {
    console.error('Error logging webhook action:', error);
    // Don't throw - audit logging shouldn't break the main operation
  }
}

/**
 * Get webhook audit history
 */
export async function getWebhookAuditHistory(
  pool: Pool,
  webhookId: string,
  userId: string,
  limit = 100,
  offset = 0
): Promise<{ logs: AuditLog[]; total: number }> {
  try {
    // Get total count
    const countRes = await pool.query(
      `SELECT COUNT(*) as count FROM webhook_audit_logs
       WHERE webhook_id = $1 AND user_id = $2`,
      [webhookId, userId]
    );

    // Get paginated logs
    const logsRes = await pool.query(
      `SELECT id, webhook_id, user_id, action, resource_type, resource_id,
              changes, metadata, created_at
       FROM webhook_audit_logs
       WHERE webhook_id = $1 AND user_id = $2
       ORDER BY created_at DESC
       LIMIT $3 OFFSET $4`,
      [webhookId, userId, limit, offset]
    );

    return {
      logs: logsRes.rows.map(row => ({
        ...row,
        changes: JSON.parse(row.changes),
        metadata: JSON.parse(row.metadata)
      })),
      total: parseInt(countRes.rows[0].count)
    };
  } catch (error) {
    console.error('Error getting audit history:', error);
    throw error;
  }
}

/**
 * Get user activity summary
 */
export async function getUserActivitySummary(
  pool: Pool,
  userId: string,
  hours = 24
): Promise<{
  totalActions: number;
  byAction: Record<string, number>;
  byResourceType: Record<string, number>;
  recentActivity: AuditLog[];
}> {
  try {
    const result = await pool.query(
      `SELECT action, resource_type, COUNT(*) as count
       FROM webhook_audit_logs
       WHERE user_id = $1
       AND created_at > NOW() - INTERVAL '1 hour' * $2
       GROUP BY action, resource_type`,
      [userId, hours]
    );

    const byAction: Record<string, number> = {};
    const byResourceType: Record<string, number> = {};
    let totalActions = 0;

    for (const row of result.rows) {
      const count = parseInt(row.count);
      byAction[row.action] = (byAction[row.action] || 0) + count;
      byResourceType[row.resource_type] = (byResourceType[row.resource_type] || 0) + count;
      totalActions += count;
    }

    // Get recent activity
    const recentRes = await pool.query(
      `SELECT id, webhook_id, user_id, action, resource_type, resource_id,
              changes, metadata, created_at
       FROM webhook_audit_logs
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 10`,
      [userId]
    );

    const recentActivity = recentRes.rows.map(row => ({
      ...row,
      changes: JSON.parse(row.changes),
      metadata: JSON.parse(row.metadata)
    }));

    return {
      totalActions,
      byAction,
      byResourceType,
      recentActivity
    };
  } catch (error) {
    console.error('Error getting activity summary:', error);
    throw error;
  }
}

/**
 * Clear old audit logs
 */
export async function clearOldAuditLogs(
  pool: Pool,
  userId: string,
  daysOld = 90
): Promise<number> {
  try {
    const result = await pool.query(
      `DELETE FROM webhook_audit_logs
       WHERE user_id = $1
       AND created_at < NOW() - INTERVAL '1 day' * $2`,
      [userId, daysOld]
    );

    return result.rowCount || 0;
  } catch (error) {
    console.error('Error clearing audit logs:', error);
    throw error;
  }
}
