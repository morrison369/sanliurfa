/**
 * Real-time Analytics Engine
 * Task 147: Streaming Analytics
 */

import { db } from '../db';
import { sql } from 'drizzle-orm';

export interface AnalyticsEvent {
  id: string;
  eventType: string;
  userId?: string;
  sessionId: string;
  properties: Record<string, any>;
  timestamp: Date;
}

export interface RealTimeMetric {
  name: string;
  value: number;
  timestamp: Date;
  dimensions: Record<string, string>;
}

// In-memory metrics store (use Redis in production)
const metricsStore = new Map<string, number>();
const eventsBuffer: AnalyticsEvent[] = [];

/**
 * Track event
 */
export async function trackEvent(event: Omit<AnalyticsEvent, 'id'>): Promise<void> {
  const fullEvent: AnalyticsEvent = {
    id: generateId(),
    ...event,
  };

  eventsBuffer.push(fullEvent);

  // Batch insert when buffer reaches threshold
  if (eventsBuffer.length >= 100) {
    await flushEvents();
  }

  // Update real-time metrics
  updateMetrics(fullEvent);
}

/**
 * Flush events to database
 */
export async function flushEvents(): Promise<void> {
  if (eventsBuffer.length === 0) return;

  const batch = eventsBuffer.splice(0, eventsBuffer.length);

  // Bulk insert
  const values = batch.map(e => `('${e.id}', '${e.eventType}', '${e.userId || ''}', '${e.sessionId}', '${JSON.stringify(e.properties)}', '${e.timestamp.toISOString()}')`).join(',');

  await db.execute(sql`
    INSERT INTO analytics_events_realtime (id, event_type, user_id, session_id, properties, timestamp)
    VALUES ${sql.raw(values)}
  `);
}

/**
 * Get real-time metrics
 */
export async function getRealTimeMetrics(
  metricNames: string[],
  timeWindow: number = 300 // 5 minutes
): Promise<RealTimeMetric[]> {
  const since = new Date(Date.now() - timeWindow * 1000);

  const result = await db.execute(sql`
    SELECT 
      event_type,
      COUNT(*) as count,
      COUNT(DISTINCT user_id) as unique_users,
      COUNT(DISTINCT session_id) as sessions,
      date_trunc('minute', timestamp) as minute
    FROM analytics_events_realtime
    WHERE timestamp > ${since}
    AND event_type = ANY(${metricNames})
    GROUP BY event_type, date_trunc('minute', timestamp)
    ORDER BY minute DESC
  `);

  return result.rows.map((row: any) => ({
    name: row.event_type,
    value: parseInt(row.count),
    timestamp: new Date(row.minute),
    dimensions: {
      uniqueUsers: row.unique_users,
      sessions: row.sessions,
    },
  }));
}

/**
 * Real-time dashboard data
 */
export async function getDashboardData(): Promise<{
  activeUsers: number;
  pageViewsPerMinute: number;
  topPages: Array<{ page: string; views: number }>;
  conversions: number;
}> {
  const oneMinuteAgo = new Date(Date.now() - 60000);

  const [activeUsers, pageViews, topPages, conversions] = await Promise.all([
    // Active users (last 5 minutes)
    db.execute(sql`
      SELECT COUNT(DISTINCT user_id) as count 
      FROM analytics_events_realtime 
      WHERE timestamp > ${new Date(Date.now() - 300000)}
    `),

    // Page views per minute
    db.execute(sql`
      SELECT COUNT(*) as count 
      FROM analytics_events_realtime 
      WHERE event_type = 'page_view' AND timestamp > ${oneMinuteAgo}
    `),

    // Top pages
    db.execute(sql`
      SELECT properties->>'page' as page, COUNT(*) as views
      FROM analytics_events_realtime
      WHERE event_type = 'page_view' AND timestamp > ${oneMinuteAgo}
      GROUP BY properties->>'page'
      ORDER BY views DESC
      LIMIT 5
    `),

    // Conversions
    db.execute(sql`
      SELECT COUNT(*) as count 
      FROM analytics_events_realtime 
      WHERE event_type = 'conversion' AND timestamp > ${oneMinuteAgo}
    `),
  ]);

  return {
    activeUsers: parseInt(activeUsers.rows[0]?.count || '0'),
    pageViewsPerMinute: parseInt(pageViews.rows[0]?.count || '0'),
    topPages: topPages.rows.map((r: any) => ({ page: r.page, views: parseInt(r.views) })),
    conversions: parseInt(conversions.rows[0]?.count || '0'),
  };
}

/**
 * Create real-time alert
 */
export async function createAlert(
  name: string,
  condition: {
    metric: string;
    operator: 'gt' | 'lt' | 'eq';
    threshold: number;
    duration: number;
  },
  actions: Array<{ type: 'email' | 'webhook' | 'slack'; target: string }>
): Promise<string> {
  const alertId = generateId();

  await db.execute(sql`
    INSERT INTO analytics_alerts (id, name, condition_config, actions, created_at)
    VALUES (${alertId}, ${name}, ${JSON.stringify(condition)}, ${JSON.stringify(actions)}, ${new Date()})
  `);

  return alertId;
}

/**
 * Check alerts
 */
export async function checkAlerts(): Promise<void> {
  const alerts = await db.execute(sql`SELECT * FROM analytics_alerts WHERE enabled = true`);

  for (const alert of alerts.rows) {
    const condition = JSON.parse(alert.condition_config);
    
    // Get current metric value
    const metric = await db.execute(sql`
      SELECT COUNT(*) as value 
      FROM analytics_events_realtime 
      WHERE event_type = ${condition.metric} 
      AND timestamp > ${new Date(Date.now() - condition.duration * 1000)}
    `);

    const value = parseInt(metric.rows[0]?.value || '0');
    let triggered = false;

    switch (condition.operator) {
      case 'gt': triggered = value > condition.threshold; break;
      case 'lt': triggered = value < condition.threshold; break;
      case 'eq': triggered = value === condition.threshold; break;
    }

    if (triggered) {
      await triggerAlert(alert.id, value);
    }
  }
}

async function triggerAlert(alertId: string, value: number): Promise<void> {
  const alert = await db.execute(sql`SELECT * FROM analytics_alerts WHERE id = ${alertId}`);
  const actions = JSON.parse(alert.rows[0].actions);

  for (const action of actions) {
    console.log(`[Alert] ${alert.rows[0].name}: ${value} - ${action.type} to ${action.target}`);
  }
}

function updateMetrics(event: AnalyticsEvent): void {
  const key = `${event.eventType}:${event.timestamp.toISOString().slice(0, 16)}`;
  metricsStore.set(key, (metricsStore.get(key) || 0) + 1);
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
