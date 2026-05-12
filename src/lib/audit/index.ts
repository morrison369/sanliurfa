/**
 * Audit Trail System
 * Comprehensive change tracking for compliance
 */

import { query } from '../postgres';

export type AuditAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'view'
  | 'login'
  | 'logout'
  | 'export'
  | 'import'
  | 'approve'
  | 'reject'
  | 'ban'
  | 'unban'
  | 'permission_grant'
  | 'permission_revoke';

export type AuditEntityType =
  | 'user'
  | 'place'
  | 'review'
  | 'comment'
  | 'collection'
  | 'settings'
  | 'role'
  | 'permission'
  | 'config';

export interface AuditLog {
  id: string;
  userId?: string;
  userName?: string;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId?: string;
  oldValue?: any;
  newValue?: any;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  severity: 'info' | 'warning' | 'critical';
  createdAt: Date;
}

export interface AuditQuery {
  userId?: string;
  action?: AuditAction;
  entityType?: AuditEntityType;
  entityId?: string;
  severity?: AuditLog['severity'];
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

/**
 * Log an audit event
 */
export async function logAudit(
  action: AuditAction,
  entityType: AuditEntityType,
  options: {
    userId?: string;
    entityId?: string;
    oldValue?: any;
    newValue?: any;
    metadata?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
    severity?: AuditLog['severity'];
  } = {}
): Promise<void> {
  const {
    userId,
    entityId,
    oldValue,
    newValue,
    metadata,
    ipAddress,
    userAgent,
    severity = 'info',
  } = options;

  // Get user name if available
  let userName: string | undefined;
  if (userId) {
    const userResult = await query('SELECT full_name FROM users WHERE id = $1', [userId]);
    userName = userResult.rows[0]?.full_name;
  }

  await query(
    `INSERT INTO audit_logs (user_id, user_name, action, entity_type, entity_id, 
                            old_value, new_value, metadata, ip_address, user_agent, 
                            severity, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())`,
    [
      userId,
      userName,
      action,
      entityType,
      entityId,
      oldValue ? JSON.stringify(oldValue) : null,
      newValue ? JSON.stringify(newValue) : null,
      metadata ? JSON.stringify(metadata) : null,
      ipAddress,
      userAgent,
      severity,
    ]
  );
}

/**
 * Query audit logs
 */
export async function queryAuditLogs(
  queryParams: AuditQuery
): Promise<{ logs: AuditLog[]; total: number }> {
  const { userId, action, entityType, entityId, severity, startDate, endDate, limit = 50, offset = 0 } = queryParams;

  const conditions: string[] = [];
  const params: any[] = [];

  if (userId) {
    params.push(userId);
    conditions.push(`user_id = $${params.length}`);
  }

  if (action) {
    params.push(action);
    conditions.push(`action = $${params.length}`);
  }

  if (entityType) {
    params.push(entityType);
    conditions.push(`entity_type = $${params.length}`);
  }

  if (entityId) {
    params.push(entityId);
    conditions.push(`entity_id = $${params.length}`);
  }

  if (severity) {
    params.push(severity);
    conditions.push(`severity = $${params.length}`);
  }

  if (startDate) {
    params.push(startDate);
    conditions.push(`created_at >= $${params.length}`);
  }

  if (endDate) {
    params.push(endDate);
    conditions.push(`created_at <= $${params.length}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const sql = `
    SELECT * FROM audit_logs
    ${whereClause}
    ORDER BY created_at DESC
    LIMIT $${params.length + 1} OFFSET $${params.length + 2}
  `;

  const [countResult, result] = await Promise.all([
    query(`SELECT COUNT(*) FROM audit_logs ${whereClause}`, params),
    query(sql, [...params, limit, offset]),
  ]);

  return {
    logs: result.rows.map(mapAuditRow),
    total: parseInt(countResult.rows[0].count, 10),
  };
}

/**
 * Get audit log by ID
 */
export async function getAuditLogById(id: string): Promise<AuditLog | null> {
  const result = await query('SELECT * FROM audit_logs WHERE id = $1', [id]);

  if (result.rows.length === 0) return null;
  return mapAuditRow(result.rows[0]);
}

/**
 * Get entity change history
 */
export async function getEntityHistory(
  entityType: AuditEntityType,
  entityId: string,
  limit = 20
): Promise<AuditLog[]> {
  const result = await query(
    `SELECT * FROM audit_logs
    WHERE entity_type = $1 AND entity_id = $2
    ORDER BY created_at DESC
    LIMIT $3`,
    [entityType, entityId, limit]
  );

  return result.rows.map(mapAuditRow);
}

/**
 * Get user activity audit
 */
export async function getUserAuditHistory(
  userId: string,
  limit = 50
): Promise<AuditLog[]> {
  const result = await query(
    `SELECT * FROM audit_logs
    WHERE user_id = $1
    ORDER BY created_at DESC
    LIMIT $2`,
    [userId, limit]
  );

  return result.rows.map(mapAuditRow);
}

/**
 * Export audit logs (compliance export)
 */
export async function exportAuditLogs(
  startDate: Date,
  endDate: Date,
  format: 'json' | 'csv' = 'json'
): Promise<string> {
  const result = await query(
    `SELECT * FROM audit_logs
    WHERE created_at >= $1 AND created_at <= $2
    ORDER BY created_at`,
    [startDate, endDate]
  );

  const logs = result.rows.map(mapAuditRow);

  if (format === 'csv') {
    const headers = ['id', 'userId', 'userName', 'action', 'entityType', 'entityId', 'severity', 'createdAt'];
    const rows = logs.map(log => [
      log.id,
      log.userId,
      log.userName,
      log.action,
      log.entityType,
      log.entityId,
      log.severity,
      log.createdAt.toISOString(),
    ]);
    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }

  return JSON.stringify(logs, null, 2);
}

/**
 * Archive old audit logs
 */
export async function archiveOldAuditLogs(
  olderThanDays: number = 365
): Promise<{ archived: number; fileName: string }> {
  const archiveDate = new Date();
  archiveDate.setDate(archiveDate.getDate() - olderThanDays);

  // Get logs to archive
  const result = await query(
    `SELECT * FROM audit_logs WHERE created_at < $1`,
    [archiveDate]
  );

  const logs = result.rows.map(mapAuditRow);
  const fileName = `audit_archive_${new Date().toISOString().split('T')[0]}.json`;

  // In production, save to file/S3
  // await saveToStorage(fileName, JSON.stringify(logs));

  // Delete archived logs
  await query(`DELETE FROM audit_logs WHERE created_at < $1`, [archiveDate]);

  return {
    archived: logs.length,
    fileName,
  };
}

/**
 * Get audit statistics
 */
export async function getAuditStats(
  period: 'day' | 'week' | 'month' = 'day'
): Promise<{
  totalEvents: number;
  byAction: Record<string, number>;
  bySeverity: Record<string, number>;
  criticalEvents: AuditLog[];
}> {
  const daysMap: Record<string, number> = { day: 1, week: 7, month: 30 };
  const days = daysMap[period] || 1;

  const [totalResult, actionResult, severityResult, criticalResult] = await Promise.all([
    query(
      `SELECT COUNT(*) FROM audit_logs WHERE created_at >= NOW() - ($1 * INTERVAL '1 day')`,
      [days]
    ),
    query(
      `SELECT action, COUNT(*) as count FROM audit_logs
      WHERE created_at >= NOW() - ($1 * INTERVAL '1 day')
      GROUP BY action`,
      [days]
    ),
    query(
      `SELECT severity, COUNT(*) as count FROM audit_logs
      WHERE created_at >= NOW() - ($1 * INTERVAL '1 day')
      GROUP BY severity`,
      [days]
    ),
    query(
      `SELECT * FROM audit_logs
      WHERE severity = 'critical' AND created_at >= NOW() - ($1 * INTERVAL '1 day')
      ORDER BY created_at DESC
      LIMIT 10`,
      [days]
    ),
  ]);

  const byAction: Record<string, number> = {};
  actionResult.rows.forEach(row => {
    byAction[row.action] = parseInt(row.count, 10);
  });

  const bySeverity: Record<string, number> = {};
  severityResult.rows.forEach(row => {
    bySeverity[row.severity] = parseInt(row.count, 10);
  });

  return {
    totalEvents: parseInt(totalResult.rows[0].count, 10),
    byAction,
    bySeverity,
    criticalEvents: criticalResult.rows.map(mapAuditRow),
  };
}

/**
 * Detect suspicious activity
 */
export async function detectSuspiciousActivity(
  userId: string,
  minutes: number = 10
): Promise<{ isSuspicious: boolean; reasons: string[] }> {
  const reasons: string[] = [];

  // Check for rapid actions
  const rapidResult = await query(
    `SELECT COUNT(*) FROM audit_logs
    WHERE user_id = $1 AND created_at >= NOW() - ($2 * INTERVAL '1 minute')`,
    [userId, minutes]
  );

  const actionCount = parseInt(rapidResult.rows[0].count, 10);
  if (actionCount > 50) {
    reasons.push(`Too many actions (${actionCount}) in ${minutes} minutes`);
  }

  // Check for failed logins
  const loginResult = await query(
    `SELECT COUNT(*) FROM audit_logs
    WHERE user_id = $1 AND action = 'login' AND severity = 'warning'
    AND created_at >= NOW() - INTERVAL '1 hour'`,
    [userId]
  );

  const failedLogins = parseInt(loginResult.rows[0].count, 10);
  if (failedLogins > 5) {
    reasons.push(`Multiple failed login attempts (${failedLogins})`);
  }

  return {
    isSuspicious: reasons.length > 0,
    reasons,
  };
}

function mapAuditRow(row: any): AuditLog {
  return {
    id: row.id,
    userId: row.user_id,
    userName: row.user_name,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    oldValue: row.old_value ? JSON.parse(row.old_value) : undefined,
    newValue: row.new_value ? JSON.parse(row.new_value) : undefined,
    metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    ipAddress: row.ip_address,
    userAgent: row.user_agent,
    severity: row.severity,
    createdAt: new Date(row.created_at),
  };
}
