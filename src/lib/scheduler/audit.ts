/**
 * Scheduler: Audit Log Cleanup
 * Deletes audit logs older than retention period
 */

import { query } from '../postgres';
import { logger } from '../logger';

export interface AuditCleanupResult {
  deletedCount: number;
  remainingCount: number;
  durationMs: number;
}

/**
 * Delete audit logs older than retentionDays
 */
export async function cleanupOldAuditLogs(retentionDays: number = 90): Promise<AuditCleanupResult> {
  const start = Date.now();
  const deleteResult = await query(
    `DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '1 day' * $1`,
    [retentionDays]
  );
  const deletedCount = deleteResult.rowCount ?? 0;

  const countResult = await query(`SELECT COUNT(*) FROM audit_logs`);
  const remainingCount = parseInt(countResult.rows[0]?.count || '0');
  const durationMs = Date.now() - start;

  if (deletedCount > 0) {
    logger.info('Audit log cleanup complete', { deletedCount, remainingCount, retentionDays });
  }
  return { deletedCount, remainingCount, durationMs };
}

/**
 * Archive (move to audit_logs_archive) logs older than beforeDate
 */
export async function archiveAuditLogs(beforeDate: string): Promise<{ archived: number; failed: number }> {
  try {
    // Ensure archive table exists
    await query(`
      CREATE TABLE IF NOT EXISTS audit_logs_archive (LIKE audit_logs INCLUDING ALL)
    `);
    const result = await query(
      `WITH moved AS (
         DELETE FROM audit_logs WHERE created_at < $1 RETURNING *
       )
       INSERT INTO audit_logs_archive SELECT * FROM moved`,
      [beforeDate]
    );
    return { archived: result.rowCount ?? 0, failed: 0 };
  } catch (err) {
    logger.error('Audit log archive error', { err });
    return { archived: 0, failed: 1 };
  }
}

/**
 * Get summary stats for audit_logs table
 */
export async function getAuditLogStats(): Promise<{
  totalCount: number;
  oldestLogDate: string | null;
  newestLogDate: string | null;
}> {
  const result = await query(
    `SELECT COUNT(*) as total,
            MIN(created_at)::text as oldest,
            MAX(created_at)::text as newest
     FROM audit_logs`
  );
  const row = result.rows[0];
  return {
    totalCount: parseInt(row?.total || '0'),
    oldestLogDate: row?.oldest || null,
    newestLogDate: row?.newest || null,
  };
}

export default { cleanupOldAuditLogs, archiveAuditLogs, getAuditLogStats };
