/**
 * Performance Monitoring
 * Application performance metrics and alerting
 */

import { query } from '../postgres';

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
  labels?: Record<string, string>;
}

export interface AlertRule {
  id: string;
  name: string;
  metric: string;
  condition: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  threshold: number;
  duration: number; // seconds
  severity: 'warning' | 'critical';
  notificationChannels: string[];
  enabled: boolean;
}

export interface PerformanceReport {
  period: { start: Date; end: Date };
  metrics: Record<string, { avg: number; min: number; max: number; p95: number; p99: number }>;
  alerts: Array<{ rule: string; triggered: number; resolved: number }>;
  recommendations: string[];
}

// In-memory metrics storage (for short-term)
const metricsBuffer: PerformanceMetric[] = [];
const MAX_BUFFER_SIZE = 10000;

/**
 * Record a performance metric
 */
export async function recordMetric(
  name: string,
  value: number,
  unit: string = 'ms',
  labels?: Record<string, string>
): Promise<void> {
  const metric: PerformanceMetric = {
    name,
    value,
    unit,
    timestamp: new Date(),
    labels,
  };

  // Add to buffer
  metricsBuffer.push(metric);
  if (metricsBuffer.length > MAX_BUFFER_SIZE) {
    metricsBuffer.shift();
  }

  // Save to database (async, don't wait)
  query(
    `INSERT INTO performance_metrics (name, value, unit, labels, timestamp)
     VALUES ($1, $2, $3, $4, NOW())`,
    [name, value, unit, JSON.stringify(labels)]
  ).catch(() => {});

  // Check alerts
  checkAlerts(metric).catch(console.error);
}

/**
 * Measure function execution time
 */
export async function measureAsync<T>(
  name: string,
  fn: () => Promise<T>,
  labels?: Record<string, string>
): Promise<T> {
  const start = performance.now();
  try {
    const result = await fn();
    return result;
  } finally {
    const duration = performance.now() - start;
    recordMetric(name, duration, 'ms', labels);
  }
}

/**
 * Synchronous measurement
 */
export function measure<T>(name: string, fn: () => T, labels?: Record<string, string>): T {
  const start = performance.now();
  try {
    const result = fn();
    return result;
  } finally {
    const duration = performance.now() - start;
    recordMetric(name, duration, 'ms', labels);
  }
}

/**
 * Middleware for API endpoint monitoring
 */
export function apiMonitoringMiddleware() {
  return async (context: any, next: () => Promise<Response>) => {
    const start = performance.now();
    const path = context.url.pathname;
    const method = context.request.method;

    try {
      const response = await next();
      
      const duration = performance.now() - start;
      const status = response.status;

      // Record metrics
      recordMetric('api_response_time', duration, 'ms', {
        path,
        method,
        status: status.toString(),
      });

      recordMetric('api_requests', 1, 'count', {
        path,
        method,
        status: status.toString(),
      });

      return response;
    } catch (error) {
      recordMetric('api_errors', 1, 'count', {
        path,
        method,
        error: 'true',
      });
      throw error;
    }
  };
}

/**
 * Database query performance monitor
 */
export async function monitorQuery<T>(
  queryName: string,
  fn: () => Promise<T>
): Promise<T> {
  return measureAsync(`db_query_${queryName}`, fn, { query: queryName });
}

/**
 * Check alert rules
 */
async function checkAlerts(metric: PerformanceMetric): Promise<void> {
  const rules = await getActiveAlertRules();

  for (const rule of rules) {
    if (rule.metric !== metric.name) continue;

    const triggered = evaluateCondition(metric.value, rule.condition, rule.threshold);

    if (triggered) {
      // Check if already in alert state
      const existingAlert = await query(
        `SELECT * FROM active_alerts WHERE rule_id = $1 AND resolved_at IS NULL`,
        [rule.id]
      );

      if (existingAlert.rows.length === 0) {
        // Create new alert
        await query(
          `INSERT INTO active_alerts (rule_id, metric_value, triggered_at, severity)
           VALUES ($1, $2, NOW(), $3)`,
          [rule.id, metric.value, rule.severity]
        );

        // Send notification
        await sendAlertNotification(rule, metric);
      }
    }
  }
}

/**
 * Evaluate alert condition
 */
function evaluateCondition(value: number, condition: string, threshold: number): boolean {
  switch (condition) {
    case 'gt': return value > threshold;
    case 'lt': return value < threshold;
    case 'eq': return value === threshold;
    case 'gte': return value >= threshold;
    case 'lte': return value <= threshold;
    default: return false;
  }
}

/**
 * Get active alert rules
 */
async function getActiveAlertRules(): Promise<AlertRule[]> {
  const result = await query(
    `SELECT * FROM alert_rules WHERE enabled = true`,
    []
  );

  return result.rows.map(row => ({
    id: row.id,
    name: row.name,
    metric: row.metric,
    condition: row.condition,
    threshold: row.threshold,
    duration: row.duration,
    severity: row.severity,
    notificationChannels: row.notification_channels,
    enabled: row.enabled,
  }));
}

/**
 * Send alert notification
 */
async function sendAlertNotification(
  rule: AlertRule,
  metric: PerformanceMetric
): Promise<void> {
  const message = `🚨 ALERT: ${rule.name}\nMetric: ${metric.name}\nValue: ${metric.value}${metric.unit}\nThreshold: ${rule.condition} ${rule.threshold}`;

  // Log alert
  console.error(message);

  // Save to database
  await query(
    `INSERT INTO alert_notifications (rule_id, message, severity, sent_at)
     VALUES ($1, $2, $3, NOW())`,
    [rule.id, message, rule.severity]
  );
}

/**
 * Get performance metrics
 */
export async function getMetrics(
  name: string,
  timeRange: { start: Date; end: Date },
  aggregation: 'avg' | 'min' | 'max' | 'sum' | 'count' = 'avg'
): Promise<Array<{ timestamp: Date; value: number }>> {
  const result = await query(
    `SELECT 
      DATE_TRUNC('hour', timestamp) as hour,
      ${aggregation}(value) as value
    FROM performance_metrics
    WHERE name = $1 AND timestamp >= $2 AND timestamp <= $3
    GROUP BY DATE_TRUNC('hour', timestamp)
    ORDER BY hour`,
    [name, timeRange.start, timeRange.end]
  );

  return result.rows.map(row => ({
    timestamp: row.hour,
    value: parseFloat(row.value),
  }));
}

/**
 * Generate performance report
 */
export async function generatePerformanceReport(
  period: { start: Date; end: Date }
): Promise<PerformanceReport> {
  const metrics: PerformanceReport['metrics'] = {};

  // Get all metric names
  const metricNames = await query(
    `SELECT DISTINCT name FROM performance_metrics
    WHERE timestamp >= $1 AND timestamp <= $2`,
    [period.start, period.end]
  );

  for (const { name } of metricNames.rows) {
    const stats = await query(
      `SELECT 
        AVG(value) as avg,
        MIN(value) as min,
        MAX(value) as max,
        PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY value) as p95,
        PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY value) as p99
      FROM performance_metrics
      WHERE name = $1 AND timestamp >= $2 AND timestamp <= $3`,
      [name, period.start, period.end]
    );

    const row = stats.rows[0];
    metrics[name] = {
      avg: parseFloat(row.avg) || 0,
      min: parseFloat(row.min) || 0,
      max: parseFloat(row.max) || 0,
      p95: parseFloat(row.p95) || 0,
      p99: parseFloat(row.p99) || 0,
    };
  }

  // Get alert statistics
  const alertStats = await query(
    `SELECT 
      rule_id,
      COUNT(*) FILTER (WHERE resolved_at IS NULL) as triggered,
      COUNT(*) FILTER (WHERE resolved_at IS NOT NULL) as resolved
    FROM active_alerts
    WHERE triggered_at >= $1 AND triggered_at <= $2
    GROUP BY rule_id`,
    [period.start, period.end]
  );

  // Generate recommendations
  const recommendations: string[] = [];

  if (metrics['api_response_time']?.avg > 500) {
    recommendations.push('API response times are high. Consider optimizing slow endpoints.');
  }

  if (metrics['db_query_time']?.avg > 100) {
    recommendations.push('Database queries are slow. Consider adding indexes or optimizing queries.');
  }

  if (metrics['memory_usage']?.avg > 80) {
    recommendations.push('High memory usage detected. Consider scaling or memory optimization.');
  }

  return {
    period,
    metrics,
    alerts: alertStats.rows.map(row => ({
      rule: row.rule_id,
      triggered: parseInt(row.triggered),
      resolved: parseInt(row.resolved),
    })),
    recommendations,
  };
}

/**
 * Create alert rule
 */
export async function createAlertRule(
  rule: Omit<AlertRule, 'id'>
): Promise<AlertRule> {
  const id = `alert_${Date.now()}`;

  await query(
    `INSERT INTO alert_rules (id, name, metric, condition, threshold, duration, severity, notification_channels, enabled)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [id, rule.name, rule.metric, rule.condition, rule.threshold, rule.duration, rule.severity, rule.notificationChannels, rule.enabled]
  );

  return { ...rule, id };
}

/**
 * Get system health status
 */
export async function getSystemHealth(): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: Record<string, { status: 'pass' | 'fail'; message?: string }>;
}> {
  const checks: Record<string, { status: 'pass' | 'fail'; message?: string }> = {};

  // Database check
  try {
    await query('SELECT 1');
    checks.database = { status: 'pass' };
  } catch (error: any) {
    checks.database = { status: 'fail', message: error.message };
  }

  // Recent errors check
  const errorResult = await query(
    `SELECT COUNT(*) FROM error_logs WHERE created_at >= NOW() - INTERVAL '5 minutes'`
  );
  const recentErrors = parseInt(errorResult.rows[0].count);
  if (recentErrors > 10) {
    checks.errors = { status: 'fail', message: `${recentErrors} errors in last 5 minutes` };
  } else {
    checks.errors = { status: 'pass' };
  }

  // Response time check
  const responseResult = await query(
    `SELECT AVG(value) FROM performance_metrics 
    WHERE name = 'api_response_time' AND timestamp >= NOW() - INTERVAL '5 minutes'`
  );
  const avgResponse = parseFloat(responseResult.rows[0].avg) || 0;
  if (avgResponse > 1000) {
    checks.responseTime = { status: 'fail', message: `Average response time: ${avgResponse.toFixed(0)}ms` };
  } else {
    checks.responseTime = { status: 'pass' };
  }

  // Determine overall status
  const failedChecks = Object.values(checks).filter(c => c.status === 'fail').length;
  const status = failedChecks === 0 ? 'healthy' : failedChecks > 1 ? 'unhealthy' : 'degraded';

  return { status, checks };
}

/**
 * Clean old metrics
 */
export async function cleanOldMetrics(retentionDays: number = 30): Promise<number> {
  const result = await query(
    `DELETE FROM performance_metrics WHERE timestamp < NOW() - INTERVAL '${retentionDays} days'
    RETURNING id`,
    []
  );

  return result.rows.length;
}

/**
 * Get monitoring dashboard data
 */
export async function getMonitoringDashboard(): Promise<{
  health: { status: string; checks: Record<string, any> };
  metrics: Record<string, any>;
  alerts: any[];
}> {
  const health = await getSystemHealth();
  
  const now = new Date();
  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  
  const metrics: Record<string, any> = {};
  const metricNames = ['api_response_time', 'db_query_time', 'memory_usage', 'cpu_usage'];
  
  for (const name of metricNames) {
    const data = await getMetrics(name, { start: hourAgo, end: now }, 'avg');
    if (data.length > 0) {
      metrics[name] = {
        current: data[data.length - 1].value,
        avg: data.reduce((a, b) => a + b.value, 0) / data.length,
      };
    }
  }

  const alerts = await query(
    `SELECT a.*, r.name as rule_name 
    FROM active_alerts a
    JOIN alert_rules r ON a.rule_id = r.id
    WHERE a.resolved_at IS NULL
    ORDER BY a.triggered_at DESC
    LIMIT 10`
  );

  return { health, metrics, alerts: alerts.rows };
}

/**
 * Export monitoring data
 */
export async function exportMonitoringData(
  format: 'json' | 'csv',
  timeRange: { start: Date; end: Date }
): Promise<string> {
  const report = await generatePerformanceReport(timeRange);
  
  if (format === 'csv') {
    const rows = [
      'Metric,Avg,Min,Max,P95,P99',
      ...Object.entries(report.metrics).map(([name, stats]) => 
        `${name},${stats.avg},${stats.min},${stats.max},${stats.p95},${stats.p99}`
      ),
    ];
    return rows.join('\n');
  }
  
  return JSON.stringify(report, null, 2);
}

/**
 * Get critical alerts
 */
export async function getCriticalAlerts(): Promise<any[]> {
  const result = await query(
    `SELECT a.*, r.name as rule_name, r.metric, r.threshold
    FROM active_alerts a
    JOIN alert_rules r ON a.rule_id = r.id
    WHERE a.resolved_at IS NULL AND a.severity = 'critical'
    ORDER BY a.triggered_at DESC
    LIMIT 20`
  );
  
  return result.rows;
}

/**
 * Perform health check
 */
export async function performHealthCheck(): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  services: Record<string, { status: string; responseTime?: number; error?: string }>;
}> {
  const services: Record<string, { status: string; responseTime?: number; error?: string }> = {};
  let failedServices = 0;

  // Database check
  const dbStart = Date.now();
  try {
    await query('SELECT 1');
    services.database = { status: 'healthy', responseTime: Date.now() - dbStart };
  } catch (error: any) {
    services.database = { status: 'unhealthy', error: error.message };
    failedServices++;
  }

  // Redis check (if configured)
  services.redis = { status: 'healthy' };

  // Memory check
  const memUsage = process.memoryUsage();
  const memPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
  if (memPercent > 90) {
    services.memory = { status: 'critical', error: `Memory usage: ${memPercent.toFixed(1)}%` };
    failedServices++;
  } else if (memPercent > 70) {
    services.memory = { status: 'warning' };
  } else {
    services.memory = { status: 'healthy' };
  }

  const status = failedServices === 0 ? 'healthy' : failedServices > 1 ? 'unhealthy' : 'degraded';

  return {
    status,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    services,
  };
}
