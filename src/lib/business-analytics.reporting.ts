import { query, queryOne, queryRows } from './postgres';
import { logger } from './logging';
import type { BusinessMetrics, Dashboard, KPIDefinition, KPIValue, Report } from './business-analytics.types';
export async function defineKPI(
  key: string,
  name: string,
  options?: {
    description?: string;
    formula?: string;
    unit?: string;
    target_value?: number;
    alert_threshold?: number;
    category?: string;
    owner_id?: string;
  }
): Promise<KPIDefinition | null> {
  try {
    const result = await queryOne(
      `INSERT INTO kpi_definitions (key, name, description, formula, unit, target_value, alert_threshold, category, owner_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, key, name, description, formula, unit, target_value, alert_threshold, category, owner_id, is_active`,
      [
        key,
        name,
        options?.description,
        options?.formula,
        options?.unit,
        options?.target_value,
        options?.alert_threshold,
        options?.category,
        options?.owner_id
      ]
    );

    return result || null;
  } catch (error) {
    logger.error('Failed to define KPI', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

/**
 * Get all KPIs
 */
export async function getKPIs(isActive: boolean = true): Promise<KPIDefinition[]> {
  try {
    const results = await queryRows(
      `SELECT id, key, name, description, formula, unit, target_value, alert_threshold, category, owner_id, is_active
       FROM kpi_definitions
       WHERE is_active = $1
       ORDER BY category, name ASC`,
      [isActive]
    );

    return results;
  } catch (error) {
    logger.error('Failed to get KPIs', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

/**
 * Record a KPI value
 */
export async function recordKPIValue(
  kpi_id: string,
  value: number,
  period_date: string,
  period_type: string = 'daily',
  target_value?: number
): Promise<KPIValue | null> {
  try {
    const result = await queryOne(
      `INSERT INTO kpi_values (kpi_id, value, target_value, period_date, period_type, is_final)
       VALUES ($1, $2, $3, $4, $5, false)
       ON CONFLICT (kpi_id, period_date, period_type)
       DO UPDATE SET value = $2, target_value = $3
       RETURNING id, kpi_id, value, target_value, period_date, period_type, is_final`,
      [kpi_id, value, target_value, period_date, period_type]
    );

    return result || null;
  } catch (error) {
    logger.error('Failed to record KPI value', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

/**
 * Get KPI trend (time-series)
 */
export async function getKPITrend(
  kpi_id: string,
  period_type: string = 'daily',
  days: number = 30
): Promise<KPIValue[]> {
  try {
    const results = await queryRows(
      `SELECT id, kpi_id, value, target_value, period_date, period_type, is_final
       FROM kpi_values
       WHERE kpi_id = $1 AND period_type = $2 AND period_date >= NOW()::DATE - INTERVAL '1 day' * $3
       ORDER BY period_date ASC`,
      [kpi_id, period_type, days]
    );

    return results;
  } catch (error) {
    logger.error('Failed to get KPI trend', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

/**
 * Record business metrics snapshot
 */
export async function recordBusinessMetrics(
  metric_date: string,
  metrics: Partial<BusinessMetrics>
): Promise<BusinessMetrics | null> {
  try {
    const result = await queryOne(
      `INSERT INTO business_metrics (
        metric_date, revenue, user_count, active_users, new_users,
        engagement_rate, churn_rate, retention_rate, conversion_rate,
        avg_session_duration, page_views, bounce_rate
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       ON CONFLICT (metric_date)
       DO UPDATE SET
        revenue = COALESCE($2, business_metrics.revenue),
        user_count = COALESCE($3, business_metrics.user_count),
        active_users = COALESCE($4, business_metrics.active_users),
        new_users = COALESCE($5, business_metrics.new_users),
        engagement_rate = COALESCE($6, business_metrics.engagement_rate),
        churn_rate = COALESCE($7, business_metrics.churn_rate),
        retention_rate = COALESCE($8, business_metrics.retention_rate),
        conversion_rate = COALESCE($9, business_metrics.conversion_rate),
        avg_session_duration = COALESCE($10, business_metrics.avg_session_duration),
        page_views = COALESCE($11, business_metrics.page_views),
        bounce_rate = COALESCE($12, business_metrics.bounce_rate)
       RETURNING id, metric_date, revenue, user_count, active_users, new_users,
        engagement_rate, churn_rate, retention_rate, conversion_rate,
        avg_session_duration, page_views, bounce_rate`,
      [
        metric_date,
        metrics.revenue ?? 0,
        metrics.user_count ?? 0,
        metrics.active_users ?? 0,
        metrics.new_users ?? 0,
        metrics.engagement_rate ?? 0,
        metrics.churn_rate ?? 0,
        metrics.retention_rate ?? 0,
        metrics.conversion_rate ?? 0,
        metrics.avg_session_duration ?? 0,
        metrics.page_views ?? 0,
        metrics.bounce_rate ?? 0
      ]
    );

    return result || null;
  } catch (error) {
    logger.error('Failed to record business metrics', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

/**
 * Get business metrics for date range
 */
export async function getBusinessMetrics(startDate: string, endDate: string): Promise<BusinessMetrics[]> {
  try {
    const results = await queryRows(
      `SELECT * FROM business_metrics
       WHERE metric_date BETWEEN $1 AND $2
       ORDER BY metric_date DESC`,
      [startDate, endDate]
    );

    return results;
  } catch (error) {
    logger.error('Failed to get business metrics', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

/**
 * Create a new dashboard
 */
export async function createDashboard(
  name: string,
  owner_id: string,
  options?: {
    description?: string;
    is_public?: boolean;
    layout?: any;
    widgets?: any;
    refresh_interval?: number;
  }
): Promise<Dashboard | null> {
  try {
    const result = await queryOne(
      `INSERT INTO dashboards (name, description, owner_id, is_public, layout, widgets, refresh_interval)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, name, description, owner_id, is_public, layout, widgets, refresh_interval, created_at, updated_at`,
      [
        name,
        options?.description,
        owner_id,
        options?.is_public ?? false,
        options?.layout ? JSON.stringify(options.layout) : null,
        options?.widgets ? JSON.stringify(options.widgets) : null,
        options?.refresh_interval ?? 300
      ]
    );

    return result || null;
  } catch (error) {
    logger.error('Failed to create dashboard', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

/**
 * Get user's dashboards
 */
export async function getUserDashboards(userId: string): Promise<Dashboard[]> {
  try {
    const results = await queryRows(
      `SELECT id, name, description, owner_id, is_public, layout, widgets, refresh_interval, created_at, updated_at
       FROM dashboards
       WHERE owner_id = $1 OR is_public = true
       ORDER BY created_at DESC`,
      [userId]
    );

    return results;
  } catch (error) {
    logger.error('Failed to get user dashboards', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

/**
 * Add a widget to dashboard
 */
export async function addDashboardWidget(
  dashboard_id: string,
  widget_type: string,
  options?: {
    kpi_id?: string;
    position_x?: number;
    position_y?: number;
    width?: number;
    height?: number;
    config?: any;
  }
): Promise<any | null> {
  try {
    const result = await queryOne(
      `INSERT INTO dashboard_widgets (dashboard_id, widget_type, kpi_id, position_x, position_y, width, height, config)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, dashboard_id, widget_type, kpi_id, position_x, position_y, width, height, config, created_at`,
      [
        dashboard_id,
        widget_type,
        options?.kpi_id,
        options?.position_x ?? 0,
        options?.position_y ?? 0,
        options?.width ?? 4,
        options?.height ?? 3,
        options?.config ? JSON.stringify(options.config) : null
      ]
    );

    return result || null;
  } catch (error) {
    logger.error('Failed to add dashboard widget', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

/**
 * Create a new report
 */
export async function createReport(
  name: string,
  owner_id: string,
  options?: {
    description?: string;
    report_type?: string;
    metric_ids?: string[];
    filters?: any;
    schedule?: string;
    format?: string;
    recipients?: string[];
  }
): Promise<Report | null> {
  try {
    const result = await queryOne(
      `INSERT INTO reports (name, description, owner_id, report_type, metric_ids, filters, schedule, format, recipients, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)
       RETURNING id, name, description, owner_id, report_type, metric_ids, filters, schedule, next_run_at, format, recipients, is_active, created_at, updated_at`,
      [
        name,
        options?.description,
        owner_id,
        options?.report_type,
        options?.metric_ids ? JSON.stringify(options.metric_ids) : null,
        options?.filters ? JSON.stringify(options.filters) : null,
        options?.schedule,
        options?.format ?? 'pdf',
        options?.recipients ? JSON.stringify(options.recipients) : null
      ]
    );

    return result || null;
  } catch (error) {
    logger.error('Failed to create report', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

/**
 * Get user's reports
 */
export async function getReports(userId: string, isActive: boolean = true): Promise<Report[]> {
  try {
    const results = await queryRows(
      `SELECT id, name, description, owner_id, report_type, metric_ids, filters, schedule, next_run_at, format, recipients, is_active, created_at, updated_at
       FROM reports
       WHERE owner_id = $1 AND is_active = $2
       ORDER BY created_at DESC`,
      [userId, isActive]
    );

    return results;
  } catch (error) {
    logger.error('Failed to get reports', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

/**
 * Log report execution
 */
export async function logReportExecution(
  report_id: string,
  status: string,
  options?: {
    duration_ms?: number;
    data_rows?: number;
    file_path?: string;
    sent_to?: string[];
  }
): Promise<any | null> {
  try {
    const result = await queryOne(
      `INSERT INTO report_executions (report_id, execution_time, duration_ms, status, data_rows, file_path, sent_to)
       VALUES ($1, NOW(), $2, $3, $4, $5, $6)
       RETURNING id, report_id, execution_time, duration_ms, status, data_rows, file_path, sent_to, created_at`,
      [
        report_id,
        options?.duration_ms,
        status,
        options?.data_rows ?? 0,
        options?.file_path,
        options?.sent_to ? JSON.stringify(options.sent_to) : null
      ]
    );

    return result || null;
  } catch (error) {
    logger.error('Failed to log report execution', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

/**
 * Create a metric alert
 */
export async function createMetricAlert(
  kpi_id: string,
  threshold_value: number,
  condition: string,
  options?: {
    alert_type?: string;
    notify_users?: string[];
  }
): Promise<any | null> {
  try {
    const result = await queryOne(
      `INSERT INTO metric_alerts (kpi_id, alert_type, threshold_value, condition, notify_users, is_active)
       VALUES ($1, $2, $3, $4, $5, true)
       RETURNING id, kpi_id, alert_type, threshold_value, condition, is_active, notify_users, triggered_at, resolved_at, created_at`,
      [
        kpi_id,
        options?.alert_type,
        threshold_value,
        condition,
        options?.notify_users ? JSON.stringify(options.notify_users) : null
      ]
    );

    return result || null;
  } catch (error) {
    logger.error('Failed to create metric alert', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

/**
 * Check and trigger metric alerts
 */
export async function checkMetricAlerts(): Promise<void> {
  try {
    const alerts = await queryRows(
      `SELECT ma.id, ma.kpi_id, ma.threshold_value, ma.condition, ma.notify_users, kv.value
       FROM metric_alerts ma
       JOIN kpi_values kv ON ma.kpi_id = kv.kpi_id
       WHERE ma.is_active = true AND ma.triggered_at IS NULL
       AND kv.period_date = NOW()::DATE
       ORDER BY ma.created_at DESC`,
      []
    );

    for (const alert of alerts) {
      const shouldTrigger = evaluateCondition(alert.value, alert.threshold_value, alert.condition);

      if (shouldTrigger) {
        await query(
          `UPDATE metric_alerts SET triggered_at = NOW() WHERE id = $1`,
          [alert.id]
        );
        logger.info('Metric alert triggered', { alert_id: alert.id });
      }
    }
  } catch (error) {
    logger.error('Failed to check metric alerts', error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Create a data segment (cohort)
 */
export async function createDataSegment(
  name: string,
  segment_type: string,
  filters: any,
  options?: {
    description?: string;
  }
): Promise<any | null> {
  try {
    const result = await queryOne(
      `INSERT INTO data_segments (name, description, segment_type, filters, member_count)
       VALUES ($1, $2, $3, $4, 0)
       RETURNING id, name, description, segment_type, filters, member_count, last_updated, created_at`,
      [name, options?.description, segment_type, JSON.stringify(filters)]
    );

    return result || null;
  } catch (error) {
    logger.error('Failed to create data segment', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

/**
 * Get data segments
 */
export async function getDataSegments(segment_type?: string): Promise<any[]> {
  try {
    const results = await queryRows(
      segment_type
        ? `SELECT id, name, description, segment_type, filters, member_count, last_updated, created_at
           FROM data_segments
           WHERE segment_type = $1
           ORDER BY created_at DESC`
        : `SELECT id, name, description, segment_type, filters, member_count, last_updated, created_at
           FROM data_segments
           ORDER BY created_at DESC`,
      segment_type ? [segment_type] : []
    );

    return results;
  } catch (error) {
    logger.error('Failed to get data segments', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

/**
 * Helper: Evaluate condition for alert
 */
function evaluateCondition(value: number, threshold: number, condition: string): boolean {
  switch (condition) {
    case '>':
      return value > threshold;
    case '<':
      return value < threshold;
    case '>=':
      return value >= threshold;
    case '<=':
      return value <= threshold;
    case '==':
      return value === threshold;
    case '!=':
      return value !== threshold;
    default:
      return false;
  }
}

