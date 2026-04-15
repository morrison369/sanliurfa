/**
 * Real-time Analytics Dashboard
 * Live metrics and WebSocket-based updates
 */

import { query } from '../postgres';

export interface RealtimeMetrics {
  activeUsers: number;
  pageViews: number;
  uniqueVisitors: number;
  topPages: Array<{ path: string; views: number }>;
  topReferrers: Array<{ source: string; count: number }>;
  deviceBreakdown: Record<string, number>;
  geoData: Array<{ country: string; city: string; count: number }>;
  events: Array<{ name: string; count: number }>;
}

export interface TimeSeriesData {
  timestamp: Date;
  value: number;
}

// In-memory metrics storage
const metricsStore = {
  activeUsers: new Map<string, { lastSeen: number; data: any }>(),
  pageViews: [] as Array<{ timestamp: number; path: string }>,
  events: new Map<string, number>(),
};

const ACTIVE_USER_TIMEOUT = 5 * 60 * 1000; // 5 minutes

/**
 * Track user activity
 */
export function trackActivity(sessionId: string, data: any): void {
  metricsStore.activeUsers.set(sessionId, {
    lastSeen: Date.now(),
    data
  });
}

/**
 * Track page view
 */
export function trackPageView(path: string, referrer?: string): void {
  metricsStore.pageViews.push({
    timestamp: Date.now(),
    path
  });

  // Keep only last hour
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  metricsStore.pageViews = metricsStore.pageViews.filter(
    pv => pv.timestamp > oneHourAgo
  );
}

/**
 * Track event
 */
export function trackEvent(eventName: string): void {
  const current = metricsStore.events.get(eventName) || 0;
  metricsStore.events.set(eventName, current + 1);
}

/**
 * Get real-time metrics
 */
export async function getRealtimeMetrics(): Promise<RealtimeMetrics> {
  const now = Date.now();
  const fiveMinutesAgo = now - 5 * 60 * 1000;

  // Clean up inactive users
  for (const [sessionId, data] of metricsStore.activeUsers) {
    if (now - data.lastSeen > ACTIVE_USER_TIMEOUT) {
      metricsStore.activeUsers.delete(sessionId);
    }
  }

  // Calculate metrics
  const activeUsers = metricsStore.activeUsers.size;
  
  const recentPageViews = metricsStore.pageViews.filter(
    pv => pv.timestamp > fiveMinutesAgo
  );

  // Top pages
  const pageCounts = new Map<string, number>();
  for (const pv of recentPageViews) {
    pageCounts.set(pv.path, (pageCounts.get(pv.path) || 0) + 1);
  }
  const topPages = Array.from(pageCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([path, views]) => ({ path, views }));

  // Get database metrics
  const [dbActiveUsers, dbPageViews] = await Promise.all([
    query(`
      SELECT COUNT(DISTINCT session_id) as count
      FROM page_views
      WHERE created_at >= NOW() - INTERVAL '5 minutes'
    `),
    query(`
      SELECT COUNT(*) as count
      FROM page_views
      WHERE created_at >= NOW() - INTERVAL '1 hour'
    `)
  ]);

  // Device breakdown from recent data
  const deviceResult = await query(`
    SELECT device, COUNT(*) as count
    FROM page_views
    WHERE created_at >= NOW() - INTERVAL '1 hour'
    GROUP BY device
  `);

  const deviceBreakdown: Record<string, number> = {};
  for (const row of deviceResult.rows) {
    deviceBreakdown[row.device || 'unknown'] = parseInt(row.count);
  }

  // Geo data
  const geoResult = await query(`
    SELECT country, city, COUNT(*) as count
    FROM page_views
    WHERE created_at >= NOW() - INTERVAL '1 hour'
    AND country IS NOT NULL
    GROUP BY country, city
    ORDER BY count DESC
    LIMIT 10
  `);

  return {
    activeUsers: Math.max(activeUsers, parseInt(dbActiveUsers.rows[0]?.count || 0)),
    pageViews: parseInt(dbPageViews.rows[0]?.count || 0),
    uniqueVisitors: metricsStore.activeUsers.size,
    topPages,
    topReferrers: [], // Would need referrer tracking
    deviceBreakdown,
    geoData: geoResult.rows,
    events: Array.from(metricsStore.events.entries()).map(([name, count]) => ({
      name,
      count
    }))
  };
}

/**
 * Get time series data
 */
export async function getTimeSeries(
  metric: string,
  interval: '1m' | '5m' | '1h' = '5m',
  hours: number = 24
): Promise<TimeSeriesData[]> {
  const intervalMap: Record<string, string> = {
    '1m': '1 minute',
    '5m': '5 minutes',
    '1h': '1 hour'
  };

  const table = metric === 'pageviews' ? 'page_views' : 'tracked_events';
  const truncUnit = intervalMap[interval] || '5 minutes';
  const params: any[] = [hours];
  let sql = `
    SELECT
      date_trunc('${truncUnit}', created_at) as timestamp,
      COUNT(*) as value
    FROM ${table}
    WHERE created_at >= NOW() - ($1 * INTERVAL '1 hour')`;
  if (metric !== 'pageviews') {
    params.push(metric);
    sql += ` AND type = $${params.length}`;
  }
  sql += ' GROUP BY 1 ORDER BY 1 ASC';
  const result = await query(sql, params);

  return result.rows.map(r => ({
    timestamp: new Date(r.timestamp),
    value: parseInt(r.value)
  }));
}

/**
 * Get conversion funnel
 */
export async function getConversionFunnel(steps: string[]): Promise<Array<{
  step: string;
  users: number;
  conversionRate: number;
}>> {
  const results = [];
  let previousCount: number | null = null;

  for (let i = 0; i < steps.length; i++) {
    const result = await query(`
      SELECT COUNT(DISTINCT visitor_id) as count
      FROM tracked_events
      WHERE action = $1
      AND created_at >= NOW() - INTERVAL '7 days'
    `, [steps[i]]);

    const count = parseInt(result.rows[0].count);
    const conversionRate = previousCount ? (count / previousCount) * 100 : 100;

    results.push({
      step: steps[i],
      users: count,
      conversionRate: Math.round(conversionRate * 100) / 100
    });

    previousCount = count;
  }

  return results;
}

/**
 * WebSocket broadcast helper
 */
export function broadcastMetrics(clients: Set<any>, metrics: RealtimeMetrics): void {
  const message = JSON.stringify({
    type: 'metrics',
    timestamp: new Date().toISOString(),
    data: metrics
  });

  for (const client of clients) {
    if (client.readyState === 1) { // WebSocket.OPEN
      client.send(message);
    }
  }
}

/**
 * Start metrics collection interval
 */
export function startMetricsCollection(
  broadcastIntervalMs: number = 5000,
  onMetrics?: (metrics: RealtimeMetrics) => void
): () => void {
  const interval = setInterval(async () => {
    const metrics = await getRealtimeMetrics();
    onMetrics?.(metrics);
  }, broadcastIntervalMs);

  return () => clearInterval(interval);
}
