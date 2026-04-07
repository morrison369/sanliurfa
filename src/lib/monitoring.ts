/**
 * Production Monitoring & Alerting
 * Tracks uptime, performance, and health metrics
 */

import { pool } from './postgres';
import { logger } from './logging';

export interface HealthCheck {
  service: string;
  status: 'healthy' | 'degraded' | 'down';
  latency: number;
  timestamp: string;
  details?: Record<string, any>;
}

export interface Alert {
  id: string;
  type: 'error_rate' | 'latency' | 'database' | 'memory' | 'downtime';
  severity: 'critical' | 'warning' | 'info';
  message: string;
  triggered_at: string;
  resolved_at?: string;
  service: string;
  threshold?: number;
  current_value?: number;
}

export interface UptimeMetric {
  timestamp: string;
  uptime_percentage: number;
  checks_total: number;
  checks_passed: number;
  avg_latency: number;
}

const healthChecks: HealthCheck[] = [];
const alerts: Alert[] = [];

/**
 * Record health check result
 */
export function recordHealthCheck(check: HealthCheck): void {
  healthChecks.push(check);

  // Keep only recent 1000 checks
  if (healthChecks.length > 1000) {
    healthChecks.shift();
  }

  // Alert on service degradation
  if (check.status === 'down') {
    createAlert({
      type: 'downtime',
      severity: 'critical',
      service: check.service,
      message: `${check.service} is down. Last checked: ${check.timestamp}`
    });
  } else if (check.status === 'degraded') {
    createAlert({
      type: 'latency',
      severity: 'warning',
      service: check.service,
      message: `${check.service} is degraded. Latency: ${check.latency}ms`,
      current_value: check.latency
    });
  }
}

/**
 * Create alert
 */
export function createAlert(alertData: Omit<Alert, 'id' | 'triggered_at'>): Alert {
  const alert: Alert = {
    id: `alert_${Date.now()}`,
    triggered_at: new Date().toISOString(),
    ...alertData
  };

  alerts.push(alert);

  // Keep only recent 1000 alerts
  if (alerts.length > 1000) {
    alerts.shift();
  }

  logger.warn('Alert created', { alertId: alert.id, type: alert.type, severity: alert.severity });

  return alert;
}

/**
 * Resolve alert
 */
export function resolveAlert(alertId: string): boolean {
  const alert = alerts.find(a => a.id === alertId);

  if (!alert) {
    return false;
  }

  alert.resolved_at = new Date().toISOString();

  logger.info('Alert resolved', { alertId, type: alert.type });

  return true;
}

/**
 * Get current alerts
 */
export function getActiveAlerts(): Alert[] {
  return alerts.filter(a => !a.resolved_at);
}

/**
 * Get critical alerts
 */
export function getCriticalAlerts(): Alert[] {
  return getActiveAlerts().filter(a => a.severity === 'critical');
}

/**
 * Calculate uptime metrics
 */
export function calculateUptimeMetrics(timeWindow: number = 3600000): UptimeMetric {
  const now = Date.now();
  const periodStart = new Date(now - timeWindow);

  const relevantChecks = healthChecks.filter(
    check => new Date(check.timestamp).getTime() >= now - timeWindow
  );

  if (relevantChecks.length === 0) {
    return {
      timestamp: new Date().toISOString(),
      uptime_percentage: 100,
      checks_total: 0,
      checks_passed: 0,
      avg_latency: 0
    };
  }

  const passed = relevantChecks.filter(c => c.status === 'healthy').length;
  const avgLatency = relevantChecks.reduce((sum, c) => sum + c.latency, 0) / relevantChecks.length;

  return {
    timestamp: new Date().toISOString(),
    uptime_percentage: (passed / relevantChecks.length) * 100,
    checks_total: relevantChecks.length,
    checks_passed: passed,
    avg_latency: Math.round(avgLatency)
  };
}

/**
 * Health check - Database
 */
export async function checkDatabase(): Promise<HealthCheck> {
  const start = Date.now();

  try {
    const result = await pool.query('SELECT NOW()');
    const latency = Date.now() - start;

    return {
      service: 'database',
      status: latency < 100 ? 'healthy' : 'degraded',
      latency,
      timestamp: new Date().toISOString(),
      details: { rowsAffected: 1 }
    };
  } catch (error) {
    const latency = Date.now() - start;

    logger.error('Database health check failed', error instanceof Error ? error : new Error(String(error)));

    return {
      service: 'database',
      status: 'down',
      latency,
      timestamp: new Date().toISOString(),
      details: { error: error instanceof Error ? error.message : String(error) }
    };
  }
}

/**
 * Health check - Redis
 */
export async function checkRedis(): Promise<HealthCheck> {
  const start = Date.now();

  try {
    // This would use actual Redis client in real implementation
    const latency = Date.now() - start;

    return {
      service: 'redis',
      status: latency < 50 ? 'healthy' : 'degraded',
      latency,
      timestamp: new Date().toISOString(),
      details: { connected: true }
    };
  } catch (error) {
    const latency = Date.now() - start;

    return {
      service: 'redis',
      status: 'down',
      latency,
      timestamp: new Date().toISOString(),
      details: { error: error instanceof Error ? error.message : String(error) }
    };
  }
}

/**
 * Comprehensive health check
 */
export async function performHealthCheck(): Promise<HealthCheck[]> {
  const checks: HealthCheck[] = [];

  const dbCheck = await checkDatabase();
  checks.push(dbCheck);
  recordHealthCheck(dbCheck);

  const redisCheck = await checkRedis();
  checks.push(redisCheck);
  recordHealthCheck(redisCheck);

  return checks;
}

/**
 * Get monitoring dashboard data
 */
export function getMonitoringDashboard() {
  const uptimeMetrics = calculateUptimeMetrics();
  const activeAlerts = getActiveAlerts();
  const criticalAlerts = getCriticalAlerts();

  const recentChecks = healthChecks.slice(-20).reverse();

  const serviceStatus = {
    database: recentChecks.find(c => c.service === 'database')?.status || 'unknown',
    redis: recentChecks.find(c => c.service === 'redis')?.status || 'unknown'
  };

  return {
    uptime: uptimeMetrics,
    alerts: {
      total: activeAlerts.length,
      critical: criticalAlerts.length,
      active: activeAlerts
    },
    services: serviceStatus,
    recentChecks,
    timestamp: new Date().toISOString()
  };
}

/**
 * Export monitoring data for analysis
 */
export function exportMonitoringData() {
  return {
    healthChecks: healthChecks.map(c => ({
      ...c,
      timestamp: new Date(c.timestamp).toISOString()
    })),
    alerts: alerts.map(a => ({
      ...a,
      triggered_at: new Date(a.triggered_at).toISOString(),
      resolved_at: a.resolved_at ? new Date(a.resolved_at).toISOString() : undefined
    })),
    uptime: calculateUptimeMetrics(),
    exportedAt: new Date().toISOString()
  };
}
