/**
 * User Activity Tracking & Analytics Module
 * Page views, events, funnels, and user journey tracking
 */

import { query } from '../postgres';
import { randomBytes } from 'node:crypto';

export interface PageView {
  id: string;
  visitorId: string;
  userId?: string;
  path: string;
  referrer?: string;
  userAgent?: string;
  ip?: string;
  country?: string;
  city?: string;
  device?: 'desktop' | 'tablet' | 'mobile';
  browser?: string;
  os?: string;
  sessionId: string;
  timestamp: Date;
}

export interface TrackedEvent {
  id: string;
  visitorId: string;
  userId?: string;
  type: string;
  category: string;
  action: string;
  label?: string;
  value?: number;
  properties?: Record<string, any>;
  sessionId: string;
  timestamp: Date;
}

export interface FunnelStep {
  step: number;
  name: string;
  event: string;
  count: number;
  dropOff: number;
}

export interface UserJourney {
  sessionId: string;
  userId?: string;
  events: Array<{
    type: 'pageview' | 'event';
    data: any;
    timestamp: Date;
  }>;
  duration: number;
  converted: boolean;
}

/**
 * Generate unique visitor ID
 */
export function generateVisitorId(): string {
  return `v_${Date.now()}_${randomBytes(6).toString('hex')}`;
}

/**
 * Generate session ID
 */
export function generateSessionId(): string {
  return `s_${Date.now()}_${randomBytes(6).toString('hex')}`;
}

/**
 * Parse user agent for device/browser info
 */
export function parseUserAgent(userAgent: string): {
  device: 'desktop' | 'tablet' | 'mobile';
  browser: string;
  os: string;
} {
  const ua = userAgent.toLowerCase();
  
  // Device type
  let device: 'desktop' | 'tablet' | 'mobile' = 'desktop';
  if (/tablet|ipad/.test(ua)) device = 'tablet';
  else if (/mobile|android|iphone/.test(ua)) device = 'mobile';

  // Browser
  let browser = 'Unknown';
  if (/chrome/.test(ua)) browser = 'Chrome';
  else if (/firefox/.test(ua)) browser = 'Firefox';
  else if (/safari/.test(ua)) browser = 'Safari';
  else if (/edge/.test(ua)) browser = 'Edge';

  // OS
  let os = 'Unknown';
  if (/windows/.test(ua)) os = 'Windows';
  else if (/mac/.test(ua)) os = 'macOS';
  else if (/android/.test(ua)) os = 'Android';
  else if (/ios|iphone/.test(ua)) os = 'iOS';
  else if (/linux/.test(ua)) os = 'Linux';

  return { device, browser, os };
}

/**
 * Track page view
 */
export async function trackPageView(data: {
  visitorId: string;
  userId?: string;
  path: string;
  referrer?: string;
  userAgent?: string;
  ip?: string;
  sessionId: string;
}): Promise<void> {
  const { device, browser, os } = data.userAgent 
    ? parseUserAgent(data.userAgent) 
    : { device: 'desktop' as const, browser: 'Unknown', os: 'Unknown' };

  // Simple IP geolocation (would use real service in production)
  const country = 'TR';
  const city = 'Sanliurfa';

  await query(
    `INSERT INTO page_views 
     (visitor_id, user_id, path, referrer, user_agent, ip, country, city, 
      device, browser, os, session_id, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())`,
    [data.visitorId, data.userId || null, data.path, data.referrer, 
     data.userAgent, data.ip, country, city, device, browser, os, data.sessionId]
  );
}

/**
 * Track custom event
 */
export async function trackEvent(data: {
  visitorId: string;
  userId?: string;
  category: string;
  action: string;
  label?: string;
  value?: number;
  properties?: Record<string, any>;
  sessionId: string;
}): Promise<void> {
  const eventType = `${data.category}:${data.action}`;

  await query(
    `INSERT INTO tracked_events 
     (visitor_id, user_id, type, category, action, label, value, properties, session_id, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
    [data.visitorId, data.userId || null, eventType, data.category, 
     data.action, data.label, data.value, JSON.stringify(data.properties), data.sessionId]
  );
}

/**
 * Get analytics dashboard data
 */
export async function getAnalyticsDashboard(
  period: 'today' | 'week' | 'month' = 'today'
): Promise<{
  pageViews: number;
  uniqueVisitors: number;
  avgSessionDuration: number;
  bounceRate: number;
  topPages: Array<{ path: string; views: number }>;
  deviceBreakdown: Record<string, number>;
  referrerBreakdown: Record<string, number>;
}> {
  const startDate = new Date();
  switch (period) {
    case 'week':
      startDate.setDate(startDate.getDate() - 7);
      break;
    case 'month':
      startDate.setDate(startDate.getDate() - 30);
      break;
    default:
      startDate.setHours(0, 0, 0, 0);
  }

  const [
    pageViewsResult,
    uniqueVisitorsResult,
    avgDurationResult,
    bounceRateResult,
    topPagesResult,
    deviceResult,
    referrerResult
  ] = await Promise.all([
    query(`SELECT COUNT(*) FROM page_views WHERE created_at >= $1`, [startDate]),
    query(`SELECT COUNT(DISTINCT COALESCE(user_id::text, session_id)) FROM page_views WHERE created_at >= $1`, [startDate]),
    query(`
      SELECT AVG(duration) as avg_duration FROM (
        SELECT session_id, 
               EXTRACT(EPOCH FROM (MAX(created_at) - MIN(created_at))) as duration
        FROM page_views 
        WHERE created_at >= $1
        GROUP BY session_id
      ) sessions
    `, [startDate]),
    query(`
      SELECT 
        COUNT(CASE WHEN page_count = 1 THEN 1 END)::float / COUNT(*) as bounce_rate
      FROM (
        SELECT session_id, COUNT(*) as page_count
        FROM page_views 
        WHERE created_at >= $1
        GROUP BY session_id
      ) sessions
    `, [startDate]),
    query(`
      SELECT path, COUNT(*) as views
      FROM page_views 
      WHERE created_at >= $1
      GROUP BY path
      ORDER BY views DESC
      LIMIT 10
    `, [startDate]),
    query(`
      SELECT device, COUNT(*) as count
      FROM page_views 
      WHERE created_at >= $1
      GROUP BY device
    `, [startDate]),
    query(`
      SELECT COALESCE(referrer, 'Direct') as referrer, COUNT(*) as count
      FROM page_views 
      WHERE created_at >= $1
      GROUP BY referrer
      ORDER BY count DESC
      LIMIT 10
    `, [startDate])
  ]);

  const deviceBreakdown: Record<string, number> = {};
  deviceResult.rows.forEach((r: any) => {
    deviceBreakdown[r.device] = parseInt(r.count, 10);
  });

  const referrerBreakdown: Record<string, number> = {};
  referrerResult.rows.forEach((r: any) => {
    referrerBreakdown[r.referrer] = parseInt(r.count, 10);
  });

  return {
    pageViews: parseInt(pageViewsResult.rows[0].count, 10),
    uniqueVisitors: parseInt(uniqueVisitorsResult.rows[0].count, 10),
    avgSessionDuration: Math.round(avgDurationResult.rows[0]?.avg_duration || 0),
    bounceRate: Math.round((bounceRateResult.rows[0]?.bounce_rate || 0) * 100),
    topPages: topPagesResult.rows.map((r: any) => ({ path: r.path, views: parseInt(r.views, 10) })),
    deviceBreakdown,
    referrerBreakdown,
  };
}

/**
 * Get funnel analysis
 */
export async function getFunnelAnalysis(
  steps: Array<{ name: string; event: string }>,
  period: 'week' | 'month' = 'week'
): Promise<FunnelStep[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - (period === 'week' ? 7 : 30));

  const results: FunnelStep[] = [];
  let previousCount: number | null = null;

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    
    const result = await query(
      `SELECT COUNT(DISTINCT visitor_id) as count
       FROM tracked_events 
       WHERE category || ':' || action = $1
       AND created_at >= $2`,
      [step.event, startDate]
    );

    const count = parseInt(result.rows[0].count, 10);
    const dropOff = previousCount ? ((previousCount - count) / previousCount) * 100 : 0;

    results.push({
      step: i + 1,
      name: step.name,
      event: step.event,
      count,
      dropOff: Math.round(dropOff),
    });

    previousCount = count;
  }

  return results;
}

/**
 * Get user journey for a session
 */
export async function getUserJourney(sessionId: string): Promise<UserJourney | null> {
  const [session, pageViews, events] = await Promise.all([
    query(`SELECT * FROM sessions WHERE id = $1`, [sessionId]),
    query(`
      SELECT path, created_at
      FROM page_views 
      WHERE session_id = $1
      ORDER BY created_at ASC
    `, [sessionId]),
    query(`
      SELECT category, action, label, created_at
      FROM tracked_events 
      WHERE session_id = $1
      ORDER BY created_at ASC
    `, [sessionId])
  ]);

  if (session.rows.length === 0) return null;

  const journeyEvents = [
    ...pageViews.rows.map((r: any) => ({ type: 'pageview' as const, data: r, timestamp: r.created_at })),
    ...events.rows.map((r: any) => ({ type: 'event' as const, data: r, timestamp: r.created_at }))
  ].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const startTime = new Date(journeyEvents[0]?.timestamp || session.rows[0].created_at);
  const endTime = new Date(journeyEvents[journeyEvents.length - 1]?.timestamp || startTime);
  const duration = Math.round((endTime.getTime() - startTime.getTime()) / 1000);

  // Check for conversion (e.g., signup, purchase)
  const hasConversion = events.rows.some((e: any) => 
    e.action === 'signup' || e.action === 'purchase' || e.action === 'conversion'
  );

  return {
    sessionId,
    userId: session.rows[0].user_id,
    events: journeyEvents,
    duration,
    converted: hasConversion,
  };
}

/**
 * Get cohort analysis
 */
export async function getCohortAnalysis(
  cohortPeriod: 'week' | 'month' = 'week',
  retentionPeriods: number = 4
): Promise<{
  cohorts: Array<{
    period: string;
    totalUsers: number;
    retention: number[];
  }>;
}> {
  const daysPerPeriod = cohortPeriod === 'week' ? 7 : 30;
  const totalDays = retentionPeriods * daysPerPeriod;

  const result = await query(`
    WITH cohorts AS (
      SELECT
        DATE_TRUNC('${cohortPeriod}', created_at) as cohort_period,
        id as user_id
      FROM users
      WHERE created_at >= NOW() - ($1 * INTERVAL '1 day')
    ),
    activity AS (
      SELECT
        u.cohort_period,
        u.user_id,
        DATE_TRUNC('${cohortPeriod}', pv.created_at) as activity_period
      FROM cohorts u
      LEFT JOIN page_views pv ON u.user_id = pv.user_id
      WHERE pv.created_at > u.cohort_period
    )
    SELECT
      cohort_period,
      COUNT(DISTINCT user_id) as total_users,
      COUNT(DISTINCT CASE WHEN activity_period > cohort_period THEN user_id END) as retained
    FROM activity
    GROUP BY cohort_period
    ORDER BY cohort_period DESC
  `, [totalDays]);

  return {
    cohorts: result.rows.map((r: any) => ({
      period: r.cohort_period,
      totalUsers: parseInt(r.total_users, 10),
      retention: [100, Math.round((parseInt(r.retained, 10) / parseInt(r.total_users, 10)) * 100)],
    }))
  };
}

/**
 * Get real-time stats (last 5 minutes)
 */
export async function getRealtimeStats(): Promise<{
  activeUsers: number;
  pageViewsLast5Min: number;
  topPages: Array<{ path: string; views: number }>;
}> {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

  const [activeUsers, pageViews, topPages] = await Promise.all([
    query(`
      SELECT COUNT(DISTINCT session_id) 
      FROM page_views 
      WHERE created_at >= $1
    `, [fiveMinutesAgo]),
    query(`
      SELECT COUNT(*) 
      FROM page_views 
      WHERE created_at >= $1
    `, [fiveMinutesAgo]),
    query(`
      SELECT path, COUNT(*) as views
      FROM page_views 
      WHERE created_at >= $1
      GROUP BY path
      ORDER BY views DESC
      LIMIT 5
    `, [fiveMinutesAgo])
  ]);

  return {
    activeUsers: parseInt(activeUsers.rows[0].count, 10),
    pageViewsLast5Min: parseInt(pageViews.rows[0].count, 10),
    topPages: topPages.rows.map((r: any) => ({ path: r.path, views: parseInt(r.views, 10) })),
  };
}

/**
 * Track goal/conversion
 */
export async function trackConversion(
  sessionId: string,
  goalName: string,
  value?: number,
  properties?: Record<string, any>
): Promise<void> {
  const sessionResult = await query(
    `SELECT COALESCE(user_id::text, session_id) as visitor_id FROM page_views WHERE session_id = $1 LIMIT 1`,
    [sessionId]
  );
  const visitorId = sessionResult.rows[0]?.visitor_id || '';

  await trackEvent({
    visitorId,
    category: 'conversion',
    action: goalName,
    sessionId,
    ...(value !== undefined ? { value } : {}),
    properties: { ...properties, conversion: true },
  });
}

/**
 * Get conversion rate
 */
export async function getConversionRate(
  goalName: string,
  period: 'week' | 'month' = 'week'
): Promise<{
  sessions: number;
  conversions: number;
  rate: number;
}> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - (period === 'week' ? 7 : 30));

  const [sessions, conversions] = await Promise.all([
    query(`
      SELECT COUNT(DISTINCT session_id) 
      FROM page_views 
      WHERE created_at >= $1
    `, [startDate]),
    query(`
      SELECT COUNT(DISTINCT session_id) 
      FROM tracked_events 
      WHERE category = 'conversion' 
      AND action = $1
      AND created_at >= $2
    `, [goalName, startDate])
  ]);

  const totalSessions = parseInt(sessions.rows[0].count, 10);
  const totalConversions = parseInt(conversions.rows[0].count, 10);

  return {
    sessions: totalSessions,
    conversions: totalConversions,
    rate: totalSessions > 0 ? Math.round((totalConversions / totalSessions) * 100) : 0,
  };
}

/**
 * Clean old tracking data
 */
export async function cleanupOldTrackingData(retentionDays: number = 90): Promise<{
  pageViews: number;
  events: number;
}> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  const [pageViews, events] = await Promise.all([
    query(`DELETE FROM page_views WHERE created_at < $1`, [cutoffDate]),
    query(`DELETE FROM tracked_events WHERE created_at < $1`, [cutoffDate])
  ]);

  return {
    pageViews: pageViews.rowCount,
    events: events.rowCount,
  };
}
