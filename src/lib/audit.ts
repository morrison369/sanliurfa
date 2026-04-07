/**
 * Audit Logging Sistemi
 * Tüm önemli kullanıcı eylemlerini kaydeder
 */

import { pool } from './postgres';
import { logger } from './logging';

export type AuditAction = 'create' | 'update' | 'delete' | 'view' | 'login' | 'logout' | 'download' | 'export' | 'import';

export interface AuditLogEntry {
  userId?: string;
  action: AuditAction;
  resourceType: string;
  resourceId?: string;
  description?: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  status?: 'success' | 'failure';
  errorMessage?: string;
}

/**
 * Audit konfigürasyonunu al
 */
async function getAuditConfig(resourceType: string): Promise<any> {
  try {
    const result = await pool.query(
      `SELECT * FROM audit_config WHERE resource_type = $1`,
      [resourceType]
    );
    return result.rows[0] || null;
  } catch (error) {
    logger.error('Audit konfigürasyonu alınırken hata', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

/**
 * Audit logu kaydet
 */
export async function auditLog(entry: AuditLogEntry): Promise<string | null> {
  try {
    // Konfigürasyonu kontrol et
    const config = await getAuditConfig(entry.resourceType);
    if (!config) {
      return null;
    }

    // Aksiyon türüne göre kontrol et
    const actionKey = `track_${entry.action}`;
    if (config[actionKey] === false) {
      return null;
    }

    // Hassas alanları gizle
    const sensitiveFields = config.sensitive_fields || [];
    const maskSensitiveData = (data: Record<string, any>) => {
      if (!data) return null;

      const masked = { ...data };
      sensitiveFields.forEach((field: string) => {
        if (field in masked) {
          masked[field] = '***MASKED***';
        }
      });
      return masked;
    };

    const result = await pool.query(
      `INSERT INTO audit_logs (
        user_id, action, resource_type, resource_id, description,
        old_values, new_values, ip_address, user_agent, status, error_message
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id`,
      [
        entry.userId || null,
        entry.action,
        entry.resourceType,
        entry.resourceId || null,
        entry.description || null,
        entry.oldValues ? JSON.stringify(maskSensitiveData(entry.oldValues)) : null,
        entry.newValues ? JSON.stringify(maskSensitiveData(entry.newValues)) : null,
        entry.ipAddress || null,
        entry.userAgent || null,
        entry.status || 'success',
        entry.errorMessage || null
      ]
    );

    const auditLogId = result.rows[0]?.id;

    logger.debug('Audit log kaydedildi', {
      logId: auditLogId,
      action: entry.action,
      resourceType: entry.resourceType,
      resourceId: entry.resourceId,
      userId: entry.userId
    });

    return auditLogId;
  } catch (error) {
    logger.error('Audit log kaydedilirken hata', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

/**
 * Audit loglarını sorgula
 */
export async function getAuditLogs(filters: {
  userId?: string;
  resourceType?: string;
  action?: AuditAction;
  status?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
} = {}): Promise<any[]> {
  try {
    let query = 'SELECT * FROM audit_logs WHERE 1=1';
    const params: any[] = [];
    let paramCount = 1;

    if (filters.userId) {
      query += ` AND user_id = $${paramCount}`;
      params.push(filters.userId);
      paramCount++;
    }

    if (filters.resourceType) {
      query += ` AND resource_type = $${paramCount}`;
      params.push(filters.resourceType);
      paramCount++;
    }

    if (filters.action) {
      query += ` AND action = $${paramCount}`;
      params.push(filters.action);
      paramCount++;
    }

    if (filters.status) {
      query += ` AND status = $${paramCount}`;
      params.push(filters.status);
      paramCount++;
    }

    if (filters.startDate) {
      query += ` AND created_at >= $${paramCount}`;
      params.push(filters.startDate);
      paramCount++;
    }

    if (filters.endDate) {
      query += ` AND created_at <= $${paramCount}`;
      params.push(filters.endDate);
      paramCount++;
    }

    query += ' ORDER BY created_at DESC';

    if (filters.limit) {
      query += ` LIMIT $${paramCount}`;
      params.push(filters.limit);
      paramCount++;
    }

    if (filters.offset) {
      query += ` OFFSET $${paramCount}`;
      params.push(filters.offset);
    }

    const result = await pool.query(query, params);
    return result.rows;
  } catch (error) {
    logger.error('Audit logları sorgularken hata', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

/**
 * Kullanıcı eylemlerinin özeti
 */
export async function getUserActivitySummary(userId: string, days: number = 7): Promise<any> {
  try {
    const result = await pool.query(
      `SELECT
        action,
        COUNT(*) as count,
        COUNT(CASE WHEN status = 'success' THEN 1 END) as successful,
        COUNT(CASE WHEN status = 'failure' THEN 1 END) as failed
      FROM audit_logs
      WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '${days} days'
      GROUP BY action
      ORDER BY count DESC`,
      [userId]
    );
    return result.rows;
  } catch (error) {
    logger.error('Kullanıcı aktivitesi özeti alınırken hata', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

/**
 * Kaynakta yapılan değişikliklerin geçmişi
 */
export async function getResourceHistory(resourceType: string, resourceId: string): Promise<any[]> {
  try {
    const result = await pool.query(
      `SELECT
        id, user_id, action, old_values, new_values, created_at, status
      FROM audit_logs
      WHERE resource_type = $1 AND resource_id = $2
      ORDER BY created_at ASC`,
      [resourceType, resourceId]
    );
    return result.rows;
  } catch (error) {
    logger.error('Kaynak geçmişi alınırken hata', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

/**
 * Şüpheli aktiviteleri bul
 */
export async function findSuspiciousActivity(hours: number = 24): Promise<any[]> {
  try {
    const result = await pool.query(
      `SELECT
        user_id,
        COUNT(*) as action_count,
        COUNT(DISTINCT resource_type) as resource_types,
        COUNT(CASE WHEN status = 'failure' THEN 1 END) as failed_attempts,
        array_agg(DISTINCT action) as actions
      FROM audit_logs
      WHERE created_at >= NOW() - INTERVAL '${hours} hours'
      GROUP BY user_id
      HAVING COUNT(*) > 50 OR COUNT(CASE WHEN status = 'failure' THEN 1 END) > 10
      ORDER BY action_count DESC`
    );
    return result.rows;
  } catch (error) {
    logger.error('Şüpheli aktivite bulunurken hata', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

/**
 * Audit loglarını temizle (eski kayıtları sil)
 */
export async function cleanupOldAuditLogs(daysToKeep: number = 90): Promise<number> {
  try {
    const result = await pool.query(
      `DELETE FROM audit_logs
      WHERE created_at < NOW() - INTERVAL '${daysToKeep} days'`
    );

    logger.info(`Eski audit logları temizlendi: ${result.rowCount} kayıt silindi`);
    return result.rowCount || 0;
  } catch (error) {
    logger.error('Audit logları temizlenirken hata', error instanceof Error ? error : new Error(String(error)));
    return 0;
  }
}
