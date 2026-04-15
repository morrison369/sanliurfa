/**
 * Advanced analytics service
 * User behavior, conversion tracking, and business intelligence
 */

import { generateId } from '../utils';
import { logger } from '../logging';

// Event types
export type AnalyticsEventType =
  | 'page_view'
  | 'click'
  | 'scroll'
  | 'form_submit'
  | 'purchase'
  | 'signup'
  | 'login'
  | 'search'
  | 'filter'
  | 'share'
  | 'bookmark'
  | 'review'
  | 'rating'
  | 'error'
  | 'custom';

// Analytics event
export interface AnalyticsEvent {
  id: string;
  type: AnalyticsEventType;
  userId?: string;
  sessionId: string;
  page: string;
  timestamp: string;
  properties?: Record<string, any>;
  metadata?: {
    userAgent?: string;
    ip?: string;
    referrer?: string;
    country?: string;
    city?: string;
    device?: 'desktop' | 'tablet' | 'mobile';
    browser?: string;
    os?: string;
  };
}

// Metric data
export interface MetricData {
  name: string;
  value: number;
  timestamp: string;
  dimensions?: Record<string, string>;
}

// Funnel step
export interface FunnelStep {
  name: string;
  event: string;
  count: number;
  conversionRate: number;
  dropOffRate: number;
}

// Funnel data
export interface FunnelData {
  name: string;
  steps: FunnelStep[];
  totalConversionRate: number;
  totalUsers: number;
}

// Dashboard widget
export interface DashboardWidget {
  id: string;
  type: 'metric' | 'chart' | 'table' | 'funnel';
  title: string;
  data: any;
  refreshInterval?: number;
}

// In-memory stores
const eventStore: AnalyticsEvent[] = [];
const metricsStore: MetricData[] = [];
const MAX_EVENTS = 100000;

/**
 * Track an analytics event
 */
export function trackEvent(
  type: AnalyticsEventType,
  sessionId: string,
  data: {
    userId?: string;
    page?: string;
    properties?: Record<string, any>;
    metadata?: AnalyticsEvent['metadata'];
  }
): AnalyticsEvent {
  const event: AnalyticsEvent = {
    id: generateId(),
    type,
    sessionId,
    page: data.page || '/',
    timestamp: new Date().toISOString(),
    userId: data.userId,
    properties: data.properties,
    metadata: data.metadata,
  };

  eventStore.push(event);

  // Trim if too large
  if (eventStore.length > MAX_EVENTS) {
    eventStore.splice(0, eventStore.length - MAX_EVENTS);
  }

  return event;
}

/**
 * Record a metric
 */
export function recordMetric(
  name: string,
  value: number,
  dimensions?: Record<string, string>
): void {
  metricsStore.push({
    name,
    value,
    timestamp: new Date().toISOString(),
    dimensions,
  });
}

/**
 * Get page views
 */
export function getPageViews(
  from: Date,
  to: Date,
  groupBy: 'hour' | 'day' | 'week' | 'month' = 'day'
): Array<{ period: string; count: number; uniqueUsers: number }> {
  const filtered = eventStore.filter(
    e =>
      e.type === 'page_view' &&
      new Date(e.timestamp) >= from &&
      new Date(e.timestamp) <= to
  );

  const grouped = new Map<string, { count: number; users: Set<string> }>();

  for (const event of filtered) {
    const date = new Date(event.timestamp);
    let key: string;

    switch (groupBy) {
      case 'hour':
        key = date.toISOString().slice(0, 13);
        break;
      case 'day':
        key = date.toISOString().slice(0, 10);
        break;
      case 'week':
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().slice(0, 10);
        break;
      case 'month':
        key = date.toISOString().slice(0, 7);
        break;
    }

    const existing = grouped.get(key) || { count: 0, users: new Set() };
    existing.count++;
    if (event.userId) {
      existing.users.add(event.userId);
    }
    grouped.set(key, existing);
  }

  return Array.from(grouped.entries())
    .map(([period, data]) => ({
      period,
      count: data.count,
      uniqueUsers: data.users.size,
    }))
    .sort((a, b) => a.period.localeCompare(b.period));
}

/**
 * Get top pages
 */
export function getTopPages(
  from: Date,
  to: Date,
  limit: number = 10
): Array<{ page: string; views: number; uniqueUsers: number }> {
  const filtered = eventStore.filter(
    e =>
      e.type === 'page_view' &&
      new Date(e.timestamp) >= from &&
      new Date(e.timestamp) <= to
  );

  const grouped = new Map<string, { views: number; users: Set<string> }>();

  for (const event of filtered) {
    const existing = grouped.get(event.page) || { views: 0, users: new Set() };
    existing.views++;
    if (event.userId) {
      existing.users.add(event.userId);
    }
    grouped.set(event.page, existing);
  }

  return Array.from(grouped.entries())
    .map(([page, data]) => ({
      page,
      views: data.views,
      uniqueUsers: data.users.size,
    }))
    .sort((a, b) => b.views - a.views)
    .slice(0, limit);
}

/**
 * Get user sessions
 */
export function getUserSessions(
  from: Date,
  to: Date
): {
  totalSessions: number;
  uniqueUsers: number;
  avgSessionDuration: number;
  bounceRate: number;
} {
  const filtered = eventStore.filter(
    e => new Date(e.timestamp) >= from && new Date(e.timestamp) <= to
  );

  const sessions = new Map<string, { start: Date; end: Date; events: number }>();
  const users = new Set<string>();

  for (const event of filtered) {
    if (event.userId) {
      users.add(event.userId);
    }

    const session = sessions.get(event.sessionId);
    const eventTime = new Date(event.timestamp);

    if (!session) {
      sessions.set(event.sessionId, {
        start: eventTime,
        end: eventTime,
        events: 1,
      });
    } else {
      session.end = eventTime;
      session.events++;
    }
  }

  let totalDuration = 0;
  let bouncedSessions = 0;

  for (const session of sessions.values()) {
    const duration = session.end.getTime() - session.start.getTime();
    totalDuration += duration;
    if (session.events === 1) {
      bouncedSessions++;
    }
  }

  const totalSessions = sessions.size;

  return {
    totalSessions,
    uniqueUsers: users.size,
    avgSessionDuration: totalSessions > 0 ? totalDuration / totalSessions / 1000 : 0,
    bounceRate: totalSessions > 0 ? (bouncedSessions / totalSessions) * 100 : 0,
  };
}

/**
 * Get device breakdown
 */
export function getDeviceBreakdown(
  from: Date,
  to: Date
): Array<{ device: string; count: number; percentage: number }> {
  const filtered = eventStore.filter(
    e =>
      e.type === 'page_view' &&
      new Date(e.timestamp) >= from &&
      new Date(e.timestamp) <= to
  );

  const counts = new Map<string, number>();
  let total = 0;

  for (const event of filtered) {
    const device = event.metadata?.device || 'unknown';
    counts.set(device, (counts.get(device) || 0) + 1);
    total++;
  }

  return Array.from(counts.entries())
    .map(([device, count]) => ({
      device,
      count,
      percentage: total > 0 ? (count / total) * 100 : 0,
    }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Get geographic data
 */
export function getGeographicData(
  from: Date,
  to: Date,
  limit: number = 10
): Array<{ country: string; city?: string; count: number }> {
  const filtered = eventStore.filter(
    e =>
      new Date(e.timestamp) >= from &&
      new Date(e.timestamp) <= to
  );

  const counts = new Map<string, number>();

  for (const event of filtered) {
    const country = event.metadata?.country || 'Unknown';
    const city = event.metadata?.city;
    const key = city ? `${country}:${city}` : country;
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([key, count]) => {
      const [country, city] = key.split(':');
      return { country, city, count };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/**
 * Create funnel analysis
 */
export function createFunnel(
  name: string,
  steps: string[],
  from: Date,
  to: Date
): FunnelData {
  const funnelSteps: FunnelStep[] = [];
  let previousCount = 0;
  let totalUsers = 0;

  for (let i = 0; i < steps.length; i++) {
    const stepName = steps[i];
    const events = eventStore.filter(
      e =>
        e.type === stepName &&
        new Date(e.timestamp) >= from &&
        new Date(e.timestamp) <= to
    );

    const uniqueUsers = new Set(events.map(e => e.userId || e.sessionId));
    const count = uniqueUsers.size;

    if (i === 0) {
      totalUsers = count;
    }

    const conversionRate = previousCount > 0 ? (count / previousCount) * 100 : 100;
    const dropOffRate = previousCount > 0 ? 100 - conversionRate : 0;

    funnelSteps.push({
      name: stepName,
      event: stepName,
      count,
      conversionRate,
      dropOffRate,
    });

    previousCount = count;
  }

  const totalConversionRate =
    totalUsers > 0 ? (previousCount / totalUsers) * 100 : 0;

  return {
    name,
    steps: funnelSteps,
    totalConversionRate,
    totalUsers,
  };
}

/**
 * Get real-time stats (last 5 minutes)
 */
export function getRealTimeStats(): {
  activeUsers: number;
  pageViewsLastMinute: number;
  eventsLastMinute: number;
  topPages: Array<{ page: string; count: number }>;
} {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  const oneMinuteAgo = new Date(Date.now() - 60 * 1000);

  const recent = eventStore.filter(e => new Date(e.timestamp) >= fiveMinutesAgo);
  const lastMinute = eventStore.filter(e => new Date(e.timestamp) >= oneMinuteAgo);

  const activeSessions = new Set(recent.map(e => e.sessionId));
  const pageViewsLastMinute = lastMinute.filter(e => e.type === 'page_view').length;

  const pageCounts = new Map<string, number>();
  for (const event of lastMinute.filter(e => e.type === 'page_view')) {
    pageCounts.set(event.page, (pageCounts.get(event.page) || 0) + 1);
  }

  return {
    activeUsers: activeSessions.size,
    pageViewsLastMinute,
    eventsLastMinute: lastMinute.length,
    topPages: Array.from(pageCounts.entries())
      .map(([page, count]) => ({ page, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5),
  };
}

/**
 * Get dashboard data
 */
export function getDashboardData(
  from: Date,
  to: Date
): {
  summary: {
    totalPageViews: number;
    uniqueVisitors: number;
    avgSessionDuration: number;
    bounceRate: number;
  };
  pageViews: Array<{ period: string; count: number; uniqueUsers: number }>;
  topPages: Array<{ page: string; views: number; uniqueUsers: number }>;
  devices: Array<{ device: string; count: number; percentage: number }>;
  countries: Array<{ country: string; city?: string; count: number }>;
} {
  const pageViews = getPageViews(from, to);
  const topPages = getTopPages(from, to);
  const sessions = getUserSessions(from, to);
  const devices = getDeviceBreakdown(from, to);
  const countries = getGeographicData(from, to);

  const totalPageViews = pageViews.reduce((sum, p) => sum + p.count, 0);

  return {
    summary: {
      totalPageViews,
      uniqueVisitors: sessions.uniqueUsers,
      avgSessionDuration: sessions.avgSessionDuration,
      bounceRate: sessions.bounceRate,
    },
    pageViews,
    topPages,
    devices,
    countries,
  };
}

/**
 * Export analytics data
 */
export function exportData(
  from: Date,
  to: Date,
  format: 'json' | 'csv' = 'json'
): string {
  const filtered = eventStore.filter(
    e => new Date(e.timestamp) >= from && new Date(e.timestamp) <= to
  );

  if (format === 'csv') {
    const headers = ['id', 'type', 'userId', 'sessionId', 'page', 'timestamp'];
    const rows = filtered.map(e =>
      [e.id, e.type, e.userId || '', e.sessionId, e.page, e.timestamp].join(',')
    );
    return [headers.join(','), ...rows].join('\n');
  }

  return JSON.stringify(filtered, null, 2);
}

/**
 * Clear old data
 */
export function clearOldData(daysToKeep: number = 30): number {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysToKeep);

  const initialLength = eventStore.length;
  const toRemove = eventStore.filterIndex(
    e => new Date(e.timestamp) < cutoff
  );

  for (let i = toRemove.length - 1; i >= 0; i--) {
    eventStore.splice(toRemove[i], 1);
  }

  return initialLength - eventStore.length;
}

// Initialize
logger.info('[Analytics] Advanced analytics initialized');
