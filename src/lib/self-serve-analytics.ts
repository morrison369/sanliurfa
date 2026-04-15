/**
 * Phase 182: Self-serve Analytics
 * Query builder, workspace management, metrics definition, dashboard management
 */

import { logger } from './logger';

interface AnalyticsQuery {
  queryId: string;
  name: string;
  dataProductId: string;
  select: string[];
  filters: Array<{ field: string; operator: string; value: any }>;
  groupBy: string[];
  orderBy: Array<{ field: string; direction: 'asc' | 'desc' }>;
  limit: number;
  createdBy: string;
  createdAt: number;
}

interface AnalyticsWorkspace {
  workspaceId: string;
  name: string;
  owner: string;
  savedQueries: string[];
  dashboardIds: string[];
  createdAt: number;
}

interface MetricDefinition {
  metricId: string;
  name: string;
  description: string;
  formula: string;
  dataProductId: string;
  dimensions: string[];
  unit: string;
  owner: string;
  createdAt: number;
}

interface Dashboard {
  dashboardId: string;
  name: string;
  owner: string;
  metricIds: string[];
  refreshIntervalMs: number;
  createdAt: number;
  lastViewedAt?: number;
}

class QueryBuilder {
  private queries: Map<string, AnalyticsQuery> = new Map();
  private counter = 0;

  build(name: string, dataProductId: string, createdBy: string): {
    queryId: string;
    select: (fields: string[]) => any;
    where: (field: string, operator: string, value: any) => any;
    groupBy: (fields: string[]) => any;
    orderBy: (field: string, direction: 'asc' | 'desc') => any;
    limit: (n: number) => any;
    save: () => AnalyticsQuery;
  } {
    const queryId = `query-${Date.now()}-${++this.counter}`;
    const query: AnalyticsQuery = {
      queryId, name, dataProductId, select: [], filters: [],
      groupBy: [], orderBy: [], limit: 100, createdBy, createdAt: Date.now()
    };

    const builder = {
      queryId,
      select: (fields: string[]) => { query.select = fields; return builder; },
      where: (field: string, operator: string, value: any) => { query.filters.push({ field, operator, value }); return builder; },
      groupBy: (fields: string[]) => { query.groupBy = fields; return builder; },
      orderBy: (field: string, direction: 'asc' | 'desc') => { query.orderBy.push({ field, direction }); return builder; },
      limit: (n: number) => { query.limit = n; return builder; },
      save: () => {
        this.queries.set(queryId, query);
        logger.debug('Analytics query saved', { queryId, name, dataProductId });
        return query;
      }
    };

    return builder;
  }

  getQuery(queryId: string): AnalyticsQuery | undefined {
    return this.queries.get(queryId);
  }

  listQueriesByUser(userId: string): AnalyticsQuery[] {
    return Array.from(this.queries.values()).filter(q => q.createdBy === userId);
  }

  validateQuery(query: AnalyticsQuery): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!query.select.length) errors.push('SELECT fields are required');
    if (!query.dataProductId) errors.push('Data product ID is required');
    if (query.limit > 10000) errors.push('Limit cannot exceed 10,000');
    return { valid: errors.length === 0, errors };
  }
}

class AnalyticsWorkspaceManager {
  private workspaces: Map<string, AnalyticsWorkspace> = new Map();
  private counter = 0;

  create(name: string, owner: string): AnalyticsWorkspace {
    const workspaceId = `workspace-${Date.now()}-${++this.counter}`;
    const workspace: AnalyticsWorkspace = {
      workspaceId, name, owner, savedQueries: [], dashboardIds: [], createdAt: Date.now()
    };
    this.workspaces.set(workspaceId, workspace);
    logger.debug('Analytics workspace created', { workspaceId, name, owner });
    return workspace;
  }

  addQuery(workspaceId: string, queryId: string): boolean {
    const ws = this.workspaces.get(workspaceId);
    if (ws && !ws.savedQueries.includes(queryId)) { ws.savedQueries.push(queryId); return true; }
    return false;
  }

  addDashboard(workspaceId: string, dashboardId: string): boolean {
    const ws = this.workspaces.get(workspaceId);
    if (ws && !ws.dashboardIds.includes(dashboardId)) { ws.dashboardIds.push(dashboardId); return true; }
    return false;
  }

  getWorkspace(workspaceId: string): AnalyticsWorkspace | undefined {
    return this.workspaces.get(workspaceId);
  }

  getUserWorkspaces(owner: string): AnalyticsWorkspace[] {
    return Array.from(this.workspaces.values()).filter(w => w.owner === owner);
  }
}

class MetricsDefinitionRegistry {
  private metrics: Map<string, MetricDefinition> = new Map();
  private counter = 0;

  define(name: string, description: string, formula: string, dataProductId: string, dimensions: string[], unit: string, owner: string): MetricDefinition {
    const metricId = `metric-${Date.now()}-${++this.counter}`;
    const metric: MetricDefinition = {
      metricId, name, description, formula, dataProductId, dimensions, unit, owner, createdAt: Date.now()
    };
    this.metrics.set(metricId, metric);
    logger.debug('Metric defined', { metricId, name, dataProductId });
    return metric;
  }

  getMetric(metricId: string): MetricDefinition | undefined {
    return this.metrics.get(metricId);
  }

  findByProduct(dataProductId: string): MetricDefinition[] {
    return Array.from(this.metrics.values()).filter(m => m.dataProductId === dataProductId);
  }

  search(query: string): MetricDefinition[] {
    const q = query.toLowerCase();
    return Array.from(this.metrics.values()).filter(m =>
      m.name.toLowerCase().includes(q) || m.description.toLowerCase().includes(q)
    );
  }
}

class AnalyticsDashboardManager {
  private dashboards: Map<string, Dashboard> = new Map();
  private counter = 0;

  create(name: string, owner: string, metricIds: string[], refreshIntervalMs: number = 300000): Dashboard {
    const dashboardId = `dashboard-${Date.now()}-${++this.counter}`;
    const dashboard: Dashboard = {
      dashboardId, name, owner, metricIds, refreshIntervalMs, createdAt: Date.now()
    };
    this.dashboards.set(dashboardId, dashboard);
    logger.debug('Dashboard created', { dashboardId, name, metricCount: metricIds.length });
    return dashboard;
  }

  addMetric(dashboardId: string, metricId: string): boolean {
    const dashboard = this.dashboards.get(dashboardId);
    if (dashboard && !dashboard.metricIds.includes(metricId)) {
      dashboard.metricIds.push(metricId);
      return true;
    }
    return false;
  }

  recordView(dashboardId: string): void {
    const dashboard = this.dashboards.get(dashboardId);
    if (dashboard) dashboard.lastViewedAt = Date.now();
  }

  getDashboard(dashboardId: string): Dashboard | undefined {
    return this.dashboards.get(dashboardId);
  }

  getUserDashboards(owner: string): Dashboard[] {
    return Array.from(this.dashboards.values()).filter(d => d.owner === owner);
  }

  getMostViewed(limit: number): Dashboard[] {
    return Array.from(this.dashboards.values())
      .filter(d => d.lastViewedAt)
      .sort((a, b) => (b.lastViewedAt || 0) - (a.lastViewedAt || 0))
      .slice(0, limit);
  }
}

export const queryBuilder = new QueryBuilder();
export const analyticsWorkspaceManager = new AnalyticsWorkspaceManager();
export const metricsDefinitionRegistry = new MetricsDefinitionRegistry();
export const analyticsDashboardManager = new AnalyticsDashboardManager();

export { AnalyticsQuery, AnalyticsWorkspace, MetricDefinition, Dashboard };
