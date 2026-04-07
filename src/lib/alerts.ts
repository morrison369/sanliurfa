/**
 * Alerting Sistemi
 * Hata oranı, performans, şüpheli aktivite gibi durumları izler
 * ve otomatik uyarı gönderir
 */

import { pool } from './postgres';
import { metricsCollector } from './metrics';
import { logger } from './logging';

export type AlertSeverity = 'info' | 'warning' | 'critical';
export type AlertType =
  | 'high_error_rate'
  | 'slow_response'
  | 'database_issues'
  | 'cache_miss_spike'
  | 'rate_limit_exceeded'
  | 'suspicious_activity'
  | 'pool_saturation';

export interface Alert {
  id?: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  details?: Record<string, any>;
  triggeredAt?: Date;
  resolvedAt?: Date;
  acknowledged?: boolean;
}

/**
 * Alert geçmişi tablosu
 */
export async function createAlertsTable(): Promise<void> {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS alerts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        type VARCHAR(50) NOT NULL,
        severity VARCHAR(20) NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        details JSONB,
        triggered_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        resolved_at TIMESTAMP,
        acknowledged BOOLEAN DEFAULT false,
        acknowledged_by UUID REFERENCES users(id) ON DELETE SET NULL,
        acknowledged_at TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_alerts_type ON alerts(type);
      CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity);
      CREATE INDEX IF NOT EXISTS idx_alerts_triggered_at ON alerts(triggered_at DESC);
      CREATE INDEX IF NOT EXISTS idx_alerts_resolved_at ON alerts(resolved_at);
    `);
  } catch (error) {
    logger.error('Alerts tablosu oluşturulurken hata', error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Alert kaydet
 */
export async function recordAlert(alert: Alert): Promise<string | null> {
  try {
    await createAlertsTable();

    const result = await pool.query(
      `INSERT INTO alerts (type, severity, title, message, details)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id`,
      [alert.type, alert.severity, alert.title, alert.message, alert.details ? JSON.stringify(alert.details) : null]
    );

    const alertId = result.rows[0]?.id;

    logger.warn(`Alert: ${alert.title}`, {
      alertId,
      type: alert.type,
      severity: alert.severity,
      message: alert.message,
      details: alert.details
    });

    // Notify admins
    await notifyAdmins(alert);

    return alertId;
  } catch (error) {
    logger.error('Alert kaydedilirken hata', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

/**
 * Hata oranını kontrol et
 */
export async function checkErrorRate(): Promise<void> {
  const metrics = metricsCollector.getMetrics();

  // Hata oranı %10'u aşarsa uyar
  if (metrics.errorRate > 10) {
    await recordAlert({
      type: 'high_error_rate',
      severity: metrics.errorRate > 20 ? 'critical' : 'warning',
      title: `Yüksek Hata Oranı: %${metrics.errorRate}`,
      message: `Son 1 saat içinde hata oranı %${metrics.errorRate}'e yükseldi. Toplam istekler: ${metrics.totalRequests}, Hatalı istekler: ${metrics.totalErrors}`,
      details: {
        errorRate: metrics.errorRate,
        totalRequests: metrics.totalRequests,
        totalErrors: metrics.totalErrors,
        byStatusCode: metrics.byStatusCode
      }
    });
  }
}

/**
 * Performans sorunlarını kontrol et
 */
export async function checkPerformance(): Promise<void> {
  const metrics = metricsCollector.getMetrics();
  const perfStats = metricsCollector.getPerformanceStats();

  // Ortalama yanıt süresi 1 saniyeden fazla
  if (metrics.avgDuration > 1000) {
    await recordAlert({
      type: 'slow_response',
      severity: metrics.avgDuration > 3000 ? 'critical' : 'warning',
      title: `Yavaş Yanıt: ${metrics.avgDuration}ms`,
      message: `Ortalama yanıt süresi ${metrics.avgDuration}ms (p95: ${metrics.p95Duration}ms). En yavaş endpoint: ${metrics.slowestEndpoints[0]?.endpoint || 'N/A'}`,
      details: {
        avgDuration: metrics.avgDuration,
        p95Duration: metrics.p95Duration,
        maxDuration: metrics.maxDuration,
        slowestEndpoints: metrics.slowestEndpoints
      }
    });
  }

  // Yavaş sorguların artış
  if (perfStats.slowQueryCount > 10) {
    await recordAlert({
      type: 'database_issues',
      severity: perfStats.slowQueryCount > 50 ? 'critical' : 'warning',
      title: `Yavaş Veritabanı Sorguları: ${perfStats.slowQueryCount}`,
      message: `Yavaş sorgu sayısı ${perfStats.slowQueryCount}, ortalama süresi ${perfStats.avgQueryDuration}ms`,
      details: {
        slowQueryCount: perfStats.slowQueryCount,
        avgQueryDuration: perfStats.avgQueryDuration,
        maxQueryDuration: perfStats.maxQueryDuration
      }
    });
  }

  // Veritabanı bağlantı havuzu doymuş
  if (perfStats.dbPoolStatus.activeConnections > 15) {
    await recordAlert({
      type: 'pool_saturation',
      severity: perfStats.dbPoolStatus.activeConnections > 18 ? 'critical' : 'warning',
      title: `Veritabanı Havuzu Doymuş: ${perfStats.dbPoolStatus.activeConnections}/20`,
      message: `Aktif bağlantı sayısı kritik seviyelere ulaştı. Aktif: ${perfStats.dbPoolStatus.activeConnections}, Bekleyen: ${perfStats.dbPoolStatus.waitingRequests}`,
      details: perfStats.dbPoolStatus
    });
  }

  // Cache hit rate düşük
  if (metrics.cacheHitRate < 30) {
    await recordAlert({
      type: 'cache_miss_spike',
      severity: metrics.cacheHitRate < 10 ? 'warning' : 'info',
      title: `Düşük Cache Hit Oranı: %${metrics.cacheHitRate}`,
      message: `Cache hit oranı %${metrics.cacheHitRate}'e düştü. Veritabanına yapılan istekler artmış olabilir.`,
      details: {
        cacheHitRate: metrics.cacheHitRate,
        totalRequests: metrics.totalRequests
      }
    });
  }
}

/**
 * Alertleri al
 */
export async function getAlerts(filters?: {
  type?: AlertType;
  severity?: AlertSeverity;
  acknowledged?: boolean;
  limit?: number;
  offset?: number;
}): Promise<Alert[]> {
  try {
    let query = 'SELECT * FROM alerts WHERE 1=1';
    const params: any[] = [];
    let paramCount = 1;

    if (filters?.type) {
      query += ` AND type = $${paramCount}`;
      params.push(filters.type);
      paramCount++;
    }

    if (filters?.severity) {
      query += ` AND severity = $${paramCount}`;
      params.push(filters.severity);
      paramCount++;
    }

    if (filters?.acknowledged !== undefined) {
      query += ` AND acknowledged = $${paramCount}`;
      params.push(filters.acknowledged);
      paramCount++;
    }

    query += ' ORDER BY triggered_at DESC';

    if (filters?.limit) {
      query += ` LIMIT $${paramCount}`;
      params.push(filters.limit);
      paramCount++;
    }

    if (filters?.offset) {
      query += ` OFFSET $${paramCount}`;
      params.push(filters.offset);
    }

    const result = await pool.query(query, params);
    return result.rows;
  } catch (error) {
    logger.error('Alertler alınırken hata', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

/**
 * Alerty işaretleme
 */
export async function acknowledgeAlert(alertId: string, userId: string): Promise<boolean> {
  try {
    const result = await pool.query(
      `UPDATE alerts
      SET acknowledged = true, acknowledged_by = $1, acknowledged_at = NOW()
      WHERE id = $2`,
      [userId, alertId]
    );

    return (result.rowCount || 0) > 0;
  } catch (error) {
    logger.error('Alert işaretlenirken hata', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

/**
 * Alerti çöz (resolved olarak işaretle)
 */
export async function resolveAlert(alertId: string): Promise<boolean> {
  try {
    const result = await pool.query(
      `UPDATE alerts SET resolved_at = NOW() WHERE id = $1`,
      [alertId]
    );

    return (result.rowCount || 0) > 0;
  } catch (error) {
    logger.error('Alert çözülürken hata', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

/**
 * Admin'lere bildirim gönder
 */
async function notifyAdmins(alert: Alert): Promise<void> {
  try {
    // Notifications servisi'ni dynamic olarak import et (circular dependency'yi önle)
    const { notificationService } = await import('./notifications');
    await notificationService.notifyAlert(alert);
  } catch (error) {
    logger.error('Admin notification gonderilirken hata', error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Periyodik kontrol (her 5 dakikada bir çalışmalı)
 */
export async function performHealthCheck(): Promise<void> {
  try {
    await checkErrorRate();
    await checkPerformance();
  } catch (error) {
    logger.error('Health check sırasında hata', error instanceof Error ? error : new Error(String(error)));
  }
}
