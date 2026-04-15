/**
 * Advanced Reporting & Dashboards Module
 * Custom reports, widgets, and data visualization
 */

import { query } from '../postgres';

export interface Dashboard {
  id: string;
  name: string;
  description?: string;
  tenantId?: string;
  userId: string;
  layout: DashboardLayout;
  widgets: DashboardWidget[];
  isDefault: boolean;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface DashboardLayout {
  columns: number;
  rowHeight: number;
}

export interface DashboardWidget {
  id: string;
  type: WidgetType;
  title: string;
  position: { x: number; y: number; w: number; h: number };
  config: WidgetConfig;
  data?: any;
}

export type WidgetType = 
  | 'stat-card' 
  | 'line-chart' 
  | 'bar-chart' 
  | 'pie-chart' 
  | 'table'
  | 'map'
  | 'recent-activity'
  | 'top-list'
  | 'gauge';

export interface WidgetConfig {
  dataSource: string;
  query?: string;
  filters?: Record<string, any>;
  refreshInterval?: number; // seconds
  chartConfig?: any;
  colors?: string[];
}

export interface Report {
  id: string;
  name: string;
  description?: string;
  type: 'table' | 'chart' | 'combined';
  query: string;
  parameters?: ReportParameter[];
  schedule?: string; // cron expression
  lastRun?: Date;
  lastResult?: any;
  tenantId?: string;
  createdBy: string;
  createdAt: Date;
}

export interface ReportParameter {
  name: string;
  type: 'string' | 'number' | 'date' | 'select';
  label: string;
  required?: boolean;
  defaultValue?: any;
  options?: Array<{ label: string; value: any }>;
}

/**
 * Create dashboard
 */
export async function createDashboard(
  data: Omit<Dashboard, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Dashboard> {
  const result = await query(
    `INSERT INTO dashboards (name, description, tenant_id, user_id, layout, widgets, is_default, is_public)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [data.name, data.description, data.tenantId, data.userId,
     JSON.stringify(data.layout), JSON.stringify(data.widgets), 
     data.isDefault, data.isPublic]
  );

  return result.rows[0];
}

/**
 * Get dashboard by ID
 */
export async function getDashboard(dashboardId: string): Promise<Dashboard | null> {
  const result = await query(
    `SELECT * FROM dashboards WHERE id = $1`,
    [dashboardId]
  );
  return result.rows[0] || null;
}

/**
 * Get user dashboards
 */
export async function getUserDashboards(userId: string): Promise<Dashboard[]> {
  const result = await query(
    `SELECT * FROM dashboards 
     WHERE user_id = $1 OR is_public = true
     ORDER BY is_default DESC, created_at DESC`,
    [userId]
  );
  return result.rows;
}

/**
 * Update dashboard
 */
export async function updateDashboard(
  dashboardId: string,
  updates: Partial<Dashboard>
): Promise<Dashboard | null> {
  const fields: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (updates.name) {
    fields.push(`name = $${paramIndex++}`);
    values.push(updates.name);
  }
  if (updates.description !== undefined) {
    fields.push(`description = $${paramIndex++}`);
    values.push(updates.description);
  }
  if (updates.layout) {
    fields.push(`layout = $${paramIndex++}`);
    values.push(JSON.stringify(updates.layout));
  }
  if (updates.widgets) {
    fields.push(`widgets = $${paramIndex++}`);
    values.push(JSON.stringify(updates.widgets));
  }

  if (fields.length === 0) return null;

  values.push(dashboardId);

  const result = await query(
    `UPDATE dashboards SET ${fields.join(', ')}, updated_at = NOW()
     WHERE id = $${paramIndex} RETURNING *`,
    values
  );

  return result.rows[0] || null;
}

/**
 * Delete dashboard
 */
export async function deleteDashboard(dashboardId: string): Promise<boolean> {
  const result = await query(
    `DELETE FROM dashboards WHERE id = $1`,
    [dashboardId]
  );
  return result.rowCount > 0;
}

/**
 * Get widget data
 */
export async function getWidgetData(
  widget: DashboardWidget,
  context?: { tenantId?: string; userId?: string; dateRange?: { from: Date; to: Date } }
): Promise<any> {
  switch (widget.type) {
    case 'stat-card':
      return await getStatCardData(widget.config, context);
    case 'line-chart':
      return await getLineChartData(widget.config, context);
    case 'bar-chart':
      return await getBarChartData(widget.config, context);
    case 'pie-chart':
      return await getPieChartData(widget.config, context);
    case 'table':
      return await getTableData(widget.config, context);
    case 'recent-activity':
      return await getRecentActivityData(widget.config, context);
    case 'top-list':
      return await getTopListData(widget.config, context);
    default:
      return null;
  }
}

/**
 * Get stat card data
 */
async function getStatCardData(
  config: WidgetConfig,
  context?: any
): Promise<{ value: number; change: number; trend: 'up' | 'down' | 'neutral' }> {
  const queries: Record<string, { current: string; previous: string }> = {
    'total-users': {
      current: `SELECT COUNT(*) FROM users WHERE created_at <= NOW()`,
      previous: `SELECT COUNT(*) FROM users WHERE created_at <= NOW() - INTERVAL '30 days'`
    },
    'total-places': {
      current: `SELECT COUNT(*) FROM places WHERE status = 'active'`,
      previous: `SELECT COUNT(*) FROM places WHERE status = 'active' AND created_at <= NOW() - INTERVAL '30 days'`
    },
    'new-reviews': {
      current: `SELECT COUNT(*) FROM reviews WHERE created_at >= NOW() - INTERVAL '30 days'`,
      previous: `SELECT COUNT(*) FROM reviews WHERE created_at >= NOW() - INTERVAL '60 days' AND created_at < NOW() - INTERVAL '30 days'`
    },
    'page-views': {
      current: `SELECT COUNT(*) FROM page_views WHERE created_at >= NOW() - INTERVAL '30 days'`,
      previous: `SELECT COUNT(*) FROM page_views WHERE created_at >= NOW() - INTERVAL '60 days' AND created_at < NOW() - INTERVAL '30 days'`
    }
  };

  const queryConfig = queries[config.dataSource];
  if (!queryConfig) return { value: 0, change: 0, trend: 'neutral' };

  const [currentResult, previousResult] = await Promise.all([
    query(queryConfig.current),
    query(queryConfig.previous)
  ]);

  const current = parseInt(currentResult.rows[0].count);
  const previous = parseInt(previousResult.rows[0].count);
  const change = previous > 0 ? ((current - previous) / previous) * 100 : 0;

  return {
    value: current,
    change: Math.abs(Math.round(change)),
    trend: change > 0 ? 'up' : change < 0 ? 'down' : 'neutral'
  };
}

/**
 * Get line chart data
 */
async function getLineChartData(config: WidgetConfig, context?: any): Promise<any> {
  const days = config.filters?.days || 30;
  
  const result = await query(`
    SELECT DATE(created_at) as date, COUNT(*) as value
    FROM ${config.dataSource}
    WHERE created_at >= NOW() - ($1 * INTERVAL '1 day')
    GROUP BY DATE(created_at)
    ORDER BY date ASC
  `);

  return {
    labels: result.rows.map((r: any) => r.date),
    datasets: [{
      label: config.chartConfig?.label || 'Value',
      data: result.rows.map((r: any) => parseInt(r.value))
    }]
  };
}

/**
 * Get bar chart data
 */
async function getBarChartData(config: WidgetConfig, context?: any): Promise<any> {
  const result = await query(`
    SELECT category_id, COUNT(*) as value
    FROM ${config.dataSource}
    GROUP BY category_id
    ORDER BY value DESC
    LIMIT 10
  `);

  return {
    labels: result.rows.map((r: any) => r.category_id),
    datasets: [{
      label: 'Count',
      data: result.rows.map((r: any) => parseInt(r.value))
    }]
  };
}

/**
 * Get pie chart data
 */
async function getPieChartData(config: WidgetConfig, context?: any): Promise<any> {
  const result = await query(`
    SELECT device, COUNT(*) as value
    FROM page_views
    WHERE created_at >= NOW() - INTERVAL '30 days'
    GROUP BY device
  `);

  return {
    labels: result.rows.map((r: any) => r.device),
    data: result.rows.map((r: any) => parseInt(r.value))
  };
}

/**
 * Get table data
 */
async function getTableData(config: WidgetConfig, context?: any): Promise<any> {
  const limit = config.filters?.limit || 10;
  
  const result = await query(`
    SELECT * FROM ${config.dataSource}
    ORDER BY created_at DESC
    LIMIT $1
  `, [limit, days]);

  return result.rows;
}

/**
 * Get recent activity data
 */
async function getRecentActivityData(config: WidgetConfig, context?: any): Promise<any> {
  const limit = config.filters?.limit || 10;
  
  const result = await query(`
    SELECT ua.*, u.name as user_name
    FROM user_activities ua
    LEFT JOIN users u ON ua.user_id = u.id
    ORDER BY ua.created_at DESC
    LIMIT $1
  `, [limit]);

  return result.rows;
}

/**
 * Get top list data
 */
async function getTopListData(config: WidgetConfig, context?: any): Promise<any> {
  const queries: Record<string, string> = {
    'top-places': `
      SELECT p.name, COUNT(r.id) as review_count, AVG(r.rating) as avg_rating
      FROM places p
      LEFT JOIN reviews r ON p.id = r.place_id
      GROUP BY p.id, p.name
      ORDER BY review_count DESC
      LIMIT 10
    `,
    'top-users': `
      SELECT u.name, COUNT(r.id) as review_count
      FROM users u
      LEFT JOIN reviews r ON u.id = r.user_id
      GROUP BY u.id, u.name
      ORDER BY review_count DESC
      LIMIT 10
    `
  };

  const sql = queries[config.dataSource];
  if (!sql) return [];

  const result = await query(sql);
  return result.rows;
}

/**
 * Create report
 */
export async function createReport(
  data: Omit<Report, 'id' | 'createdAt' | 'lastRun' | 'lastResult'>
): Promise<Report> {
  const result = await query(
    `INSERT INTO reports (name, description, type, query, parameters, schedule, tenant_id, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [data.name, data.description, data.type, data.query,
     JSON.stringify(data.parameters), data.schedule,
     data.tenantId, data.createdBy]
  );

  return result.rows[0];
}

/**
 * Execute report
 */
export async function executeReport(
  reportId: string,
  parameters?: Record<string, any>
): Promise<any> {
  const report = await getReport(reportId);
  if (!report) throw new Error('Report not found');

  // Apply parameters
  let query = report.query;
  if (parameters) {
    for (const [key, value] of Object.entries(parameters)) {
      query = query.replace(`:${key}`, value);
    }
  }

  const result = await query(query);

  // Update last run
  await query(
    `UPDATE reports SET last_run = NOW(), last_result = $1 WHERE id = $2`,
    [JSON.stringify(result.rows), reportId]
  );

  return result.rows;
}

/**
 * Get report by ID
 */
export async function getReport(reportId: string): Promise<Report | null> {
  const result = await query(`SELECT * FROM reports WHERE id = $1`, [reportId]);
  return result.rows[0] || null;
}

/**
 * Get available data sources
 */
export function getAvailableDataSources(): Array<{ id: string; name: string; description: string }> {
  return [
    { id: 'users', name: 'Kullanıcılar', description: 'User data' },
    { id: 'places', name: 'Mekanlar', description: 'Place data' },
    { id: 'reviews', name: 'Yorumlar', description: 'Review data' },
    { id: 'page_views', name: 'Sayfa Görüntülemeleri', description: 'Page view analytics' },
    { id: 'events', name: 'Etkinlikler', description: 'Event data' }
  ];
}

/**
 * Get widget templates
 */
export function getWidgetTemplates(): Array<{ type: WidgetType; name: string; defaultConfig: WidgetConfig }> {
  return [
    {
      type: 'stat-card',
      name: 'İstatistik Kartı',
      defaultConfig: { dataSource: 'total-users' }
    },
    {
      type: 'line-chart',
      name: 'Çizgi Grafiği',
      defaultConfig: { dataSource: 'page_views', filters: { days: 30 } }
    },
    {
      type: 'bar-chart',
      name: 'Sütun Grafiği',
      defaultConfig: { dataSource: 'places' }
    },
    {
      type: 'pie-chart',
      name: 'Pasta Grafiği',
      defaultConfig: { dataSource: 'page_views' }
    },
    {
      type: 'table',
      name: 'Tablo',
      defaultConfig: { dataSource: 'reviews', filters: { limit: 10 } }
    },
    {
      type: 'recent-activity',
      name: 'Son Aktiviteler',
      defaultConfig: { dataSource: 'user_activities', filters: { limit: 10 } }
    },
    {
      type: 'top-list',
      name: 'En İyiler Listesi',
      defaultConfig: { dataSource: 'top-places' }
    }
  ];
}
