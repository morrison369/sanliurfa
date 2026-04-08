/**
 * Phase 12: Advanced Reporting & Analytics
 * OLAP analytics, custom dashboards, business intelligence, data warehouse
 */

import { logger } from './logging';

// ==================== OLAP CUBE STRUCTURES ====================

export interface Dimension {
  name: string;
  members: string[];
  hierarchies?: Record<string, string[]>; // e.g., {date: [year, month, day]}
}

export interface Measure {
  name: string;
  aggregation: 'sum' | 'avg' | 'count' | 'min' | 'max';
  formula?: string;
}

export interface OLAPCube {
  name: string;
  dimensions: Dimension[];
  measures: Measure[];
  factTable: string;
}

/**
 * Define OLAP cubes for business analytics
 */
export const ANALYTICS_CUBES: Record<string, OLAPCube> = {
  'revenue-analysis': {
    name: 'Revenue Analysis',
    dimensions: [
      {
        name: 'Time',
        members: [],
        hierarchies: { date: ['year', 'quarter', 'month', 'day'] }
      },
      { name: 'Location', members: ['country', 'region', 'city'] },
      { name: 'Subscription Tier', members: ['free', 'premium', 'business'] },
      { name: 'Product Category', members: [''] }
    ],
    measures: [
      { name: 'Revenue', aggregation: 'sum' },
      { name: 'Transaction Count', aggregation: 'count' },
      { name: 'Average Order Value', aggregation: 'avg' }
    ],
    factTable: 'transactions'
  },
  'user-behavior': {
    name: 'User Behavior',
    dimensions: [
      {
        name: 'Time',
        members: [],
        hierarchies: { date: ['year', 'month', 'day'] }
      },
      { name: 'User Segment', members: ['new', 'active', 'churned', 'vip'] },
      { name: 'Feature Used', members: [''] },
      { name: 'Device Type', members: ['web', 'mobile', 'tablet'] }
    ],
    measures: [
      { name: 'Active Users', aggregation: 'count' },
      { name: 'Session Duration', aggregation: 'avg' },
      { name: 'Page Views', aggregation: 'sum' },
      { name: 'Conversion Rate', aggregation: 'avg' }
    ],
    factTable: 'user_activity'
  },
  'performance-metrics': {
    name: 'Performance Metrics',
    dimensions: [
      {
        name: 'Time',
        members: [],
        hierarchies: { timestamp: ['hour', 'minute'] }
      },
      { name: 'Endpoint', members: [''] },
      { name: 'Status Code', members: ['200', '4xx', '5xx'] }
    ],
    measures: [
      { name: 'Request Count', aggregation: 'count' },
      { name: 'Average Latency', aggregation: 'avg' },
      { name: 'P95 Latency', aggregation: 'max' },
      { name: 'Error Rate', aggregation: 'avg' }
    ],
    factTable: 'request_metrics'
  }
};

// ==================== REPORT BUILDER ====================

export interface ReportConfig {
  name: string;
  cube: string;
  dimensions: string[]; // Dimensions to slice/dice
  measures: string[]; // Measures to aggregate
  filters?: Record<string, any>; // WHERE conditions
  orderBy?: { dimension: string; direction: 'ASC' | 'DESC' }[];
  limit?: number;
  interval?: string; // 'daily', 'weekly', 'monthly'
}

export interface ReportResult {
  name: string;
  generatedAt: number;
  rowCount: number;
  data: any[];
  summary?: Record<string, number>;
}

/**
 * Advanced report builder for OLAP queries
 */
export class ReportBuilder {
  private reports = new Map<string, ReportConfig>();
  private resultCache = new Map<string, { result: ReportResult; timestamp: number }>();
  private readonly cacheTimeout = 3600000; // 1 hour

  /**
   * Define a new report
   */
  defineReport(name: string, config: ReportConfig): void {
    config.name = name;
    this.reports.set(name, config);
    logger.debug('Report defined', { name });
  }

  /**
   * Get defined report
   */
  getReport(name: string): ReportConfig | undefined {
    return this.reports.get(name);
  }

  /**
   * List all reports
   */
  listReports(): string[] {
    return Array.from(this.reports.keys());
  }

  /**
   * Build SQL for report (simplified OLAP query)
   */
  buildReportSQL(config: ReportConfig): string {
    const cube = ANALYTICS_CUBES[config.cube];
    if (!cube) throw new Error(`Unknown cube: ${config.cube}`);

    const selectParts = [
      ...config.dimensions,
      ...config.measures.map(m => `${m.toUpperCase()}(${m}) as ${m}`)
    ];

    const whereConditions: string[] = [];
    if (config.filters) {
      for (const [key, value] of Object.entries(config.filters)) {
        if (typeof value === 'string') {
          whereConditions.push(`${key} = '${value}'`);
        } else if (Array.isArray(value)) {
          whereConditions.push(`${key} IN (${value.map(v => `'${v}'`).join(',')})`);
        } else {
          whereConditions.push(`${key} = ${value}`);
        }
      }
    }

    let sql = `SELECT ${selectParts.join(', ')} FROM ${cube.factTable}`;

    if (whereConditions.length > 0) {
      sql += ` WHERE ${whereConditions.join(' AND ')}`;
    }

    if (config.dimensions.length > 0) {
      sql += ` GROUP BY ${config.dimensions.join(', ')}`;
    }

    if (config.orderBy) {
      const orderClauses = config.orderBy
        .map(o => `${o.dimension} ${o.direction}`)
        .join(', ');
      sql += ` ORDER BY ${orderClauses}`;
    }

    if (config.limit) {
      sql += ` LIMIT ${config.limit}`;
    }

    return sql;
  }

  /**
   * Execute report with caching
   */
  async executeReport(name: string, data: any[] = []): Promise<ReportResult> {
    const config = this.reports.get(name);
    if (!config) throw new Error(`Report not found: ${name}`);

    // Check cache
    const cached = this.resultCache.get(name);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.result;
    }

    // Build result
    const result: ReportResult = {
      name,
      generatedAt: Date.now(),
      rowCount: data.length,
      data
    };

    // Calculate summary
    if (config.measures.length > 0 && data.length > 0) {
      const summary: Record<string, number> = {};

      for (const measure of config.measures) {
        const values = data.map(row => parseFloat(row[measure]) || 0);
        summary[`${measure}_total`] = values.reduce((a, b) => a + b, 0);
        summary[`${measure}_avg`] = summary[`${measure}_total`] / values.length;
        summary[`${measure}_max`] = Math.max(...values);
        summary[`${measure}_min`] = Math.min(...values);
      }

      result.summary = summary;
    }

    // Cache result
    this.resultCache.set(name, { result, timestamp: Date.now() });

    return result;
  }
}

// ==================== DASHBOARD BUILDER ====================

export interface DashboardWidget {
  id: string;
  type: 'metric' | 'chart' | 'table' | 'gauge';
  report: string;
  title: string;
  config?: Record<string, any>;
}

export interface Dashboard {
  id: string;
  name: string;
  widgets: DashboardWidget[];
  refreshInterval: number; // milliseconds
  audience: 'executive' | 'operational' | 'technical';
}

/**
 * Dashboard manager for custom business intelligence dashboards
 */
export class DashboardManager {
  private dashboards = new Map<string, Dashboard>();

  /**
   * Create new dashboard
   */
  createDashboard(id: string, name: string, audience: 'executive' | 'operational' | 'technical'): Dashboard {
    const dashboard: Dashboard = {
      id,
      name,
      widgets: [],
      refreshInterval: 60000, // 1 minute default
      audience
    };

    this.dashboards.set(id, dashboard);
    return dashboard;
  }

  /**
   * Add widget to dashboard
   */
  addWidget(dashboardId: string, widget: DashboardWidget): void {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) throw new Error(`Dashboard not found: ${dashboardId}`);

    dashboard.widgets.push(widget);
  }

  /**
   * Get dashboard
   */
  getDashboard(id: string): Dashboard | undefined {
    return this.dashboards.get(id);
  }

  /**
   * List dashboards
   */
  listDashboards(audience?: string): Dashboard[] {
    if (!audience) {
      return Array.from(this.dashboards.values());
    }

    return Array.from(this.dashboards.values()).filter(d => d.audience === audience);
  }

  /**
   * Remove widget
   */
  removeWidget(dashboardId: string, widgetId: string): void {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) return;

    const index = dashboard.widgets.findIndex(w => w.id === widgetId);
    if (index > -1) {
      dashboard.widgets.splice(index, 1);
    }
  }

  /**
   * Set refresh interval
   */
  setRefreshInterval(dashboardId: string, interval: number): void {
    const dashboard = this.dashboards.get(dashboardId);
    if (dashboard) {
      dashboard.refreshInterval = interval;
    }
  }
}

// ==================== KPI DEFINITIONS ====================

export interface KPI {
  id: string;
  name: string;
  description: string;
  formula: string;
  target: number;
  threshold: { warning: number; critical: number };
  frequency: 'hourly' | 'daily' | 'weekly' | 'monthly';
  owner: string; // Team/person responsible
}

/**
 * Key Performance Indicators
 */
export const BUSINESS_KPIS: Record<string, KPI> = {
  'monthly-recurring-revenue': {
    id: 'mrr',
    name: 'Monthly Recurring Revenue (MRR)',
    description: 'Revenue from active subscriptions',
    formula: 'SUM(subscription_amount) WHERE active = true',
    target: 100000, // $100k
    threshold: { warning: 80000, critical: 60000 },
    frequency: 'daily',
    owner: 'Finance'
  },
  'user-acquisition-cost': {
    id: 'uac',
    name: 'User Acquisition Cost (UAC)',
    description: 'Cost per new user acquired',
    formula: 'marketing_spend / new_users',
    target: 50, // $50 per user
    threshold: { warning: 75, critical: 100 },
    frequency: 'weekly',
    owner: 'Marketing'
  },
  'customer-churn-rate': {
    id: 'churn',
    name: 'Customer Churn Rate',
    description: 'Percentage of users lost per month',
    formula: '(churned_users / total_users) * 100',
    target: 5, // 5% monthly churn
    threshold: { warning: 8, critical: 10 },
    frequency: 'weekly',
    owner: 'Product'
  },
  'net-promoter-score': {
    id: 'nps',
    name: 'Net Promoter Score (NPS)',
    description: 'Customer satisfaction and loyalty metric',
    formula: '%promoters - %detractors',
    target: 50, // 50 NPS
    threshold: { warning: 30, critical: 10 },
    frequency: 'monthly',
    owner: 'Customer Success'
  },
  'platform-uptime': {
    id: 'uptime',
    name: 'Platform Uptime',
    description: 'Percentage of time platform is available',
    formula: '(total_uptime / total_time) * 100',
    target: 99.95, // 99.95% SLA
    threshold: { warning: 99.5, critical: 99.0 },
    frequency: 'daily',
    owner: 'DevOps'
  }
};

/**
 * Track KPI performance
 */
export class KPITracker {
  private history = new Map<string, Array<{ value: number; timestamp: number }>>();

  /**
   * Record KPI value
   */
  recordKPI(kpiId: string, value: number): void {
    if (!this.history.has(kpiId)) {
      this.history.set(kpiId, []);
    }

    this.history.get(kpiId)!.push({
      value,
      timestamp: Date.now()
    });
  }

  /**
   * Get KPI history
   */
  getHistory(kpiId: string, hours: number = 24): Array<{ value: number; timestamp: number }> {
    const threshold = Date.now() - hours * 3600000;
    const history = this.history.get(kpiId) || [];

    return history.filter(h => h.timestamp >= threshold);
  }

  /**
   * Get KPI status
   */
  getStatus(kpiId: string): 'healthy' | 'warning' | 'critical' {
    const kpi = BUSINESS_KPIS[kpiId];
    const history = this.getHistory(kpiId, 1);

    if (history.length === 0) return 'healthy';

    const lastValue = history[history.length - 1].value;

    if (lastValue <= kpi.threshold.critical) return 'critical';
    if (lastValue <= kpi.threshold.warning) return 'warning';
    return 'healthy';
  }
}

// ==================== EXPORTS ====================

export const reportBuilder = new ReportBuilder();
export const dashboardManager = new DashboardManager();
export const kpiTracker = new KPITracker();
