/**
 * Business Analytics Library
 * Generate insights and metrics for place owners
 */

import { query, queryOne, queryRows, insert } from './postgres';
import { getCache, setCache, deleteCache } from './cache';
import { logger } from './logging';

export interface PlaceAnalytics {
  placeId: string;
  placeName: string;
  totalVisitors: number;
  avgRating: number;
  reviewCount: number;
  followerCount: number;
  eventCount: number;
  promotionCount: number;
  visitTrend: number;
  reviewTrend: number;
  ratingDistribution: { rating: number; count: number }[];
}

export interface VisitorStats {
  date: string;
  visitorCount: number;
  uniqueVisitors: number;
  peakHour?: string;
}

export interface ReviewAnalysis {
  totalReviews: number;
  averageRating: number;
  positiveCount: number;
  neutralCount: number;
  negativeCount: number;
  topKeywords: { keyword: string; frequency: number }[];
  recentReviews: any[];
}

export interface PromotionMetrics {
  promotionId: string;
  title: string;
  discountValue: number;
  totalRedemptions: number;
  totalSavings: number;
  conversionRate: number;
  averageOrderValue: number;
}

/**
 * Get comprehensive place analytics
 */
export async function getPlaceAnalytics(placeId: string, days: number = 30): Promise<PlaceAnalytics | null> {
  try {
    const cacheKey = `sanliurfa:analytics:place:${placeId}:${days}`;
    const cached = await getCache(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const place = await queryOne(
      'SELECT id, title, rating, visit_count, follower_count FROM places WHERE id = $1',
      [placeId]
    );

    if (!place) {
      return null;
    }

    const reviewStats = await queryOne(
      `SELECT COUNT(*) as review_count, AVG(rating) as avg_rating
       FROM reviews WHERE place_id = $1 AND created_at > NOW() - INTERVAL '${days} days'`,
      [placeId]
    );

    const ratingDist = await queryRows(
      `SELECT CAST(rating as INTEGER) as rating, COUNT(*) as count
       FROM reviews WHERE place_id = $1
       GROUP BY CAST(rating as INTEGER) ORDER BY rating DESC`,
      [placeId]
    );

    const events = await queryOne(
      `SELECT COUNT(*) as count FROM events WHERE place_id = $1 AND end_date > NOW()`,
      [placeId]
    );

    const promotions = await queryOne(
      `SELECT COUNT(*) as count FROM promotions WHERE place_id = $1 AND is_active = true`,
      [placeId]
    );

    const visitTrend = await queryOne(
      `SELECT
        (SELECT COUNT(*) FROM place_visits WHERE place_id = $1 AND created_at > NOW() - INTERVAL '7 days') as recent_visits,
        (SELECT COUNT(*) FROM place_visits WHERE place_id = $1 AND created_at > NOW() - INTERVAL '30 days') as month_visits`,
      [placeId]
    );

    const analytics: PlaceAnalytics = {
      placeId,
      placeName: place.title,
      totalVisitors: place.visit_count || 0,
      avgRating: parseFloat(place.rating || '0'),
      reviewCount: parseInt(reviewStats?.review_count || '0'),
      followerCount: place.follower_count || 0,
      eventCount: parseInt(events?.count || '0'),
      promotionCount: parseInt(promotions?.count || '0'),
      visitTrend: visitTrend ? ((visitTrend.recent_visits - visitTrend.month_visits / 4) / (visitTrend.month_visits / 4) * 100) : 0,
      reviewTrend: 0,
      ratingDistribution: ratingDist.map((r: any) => ({
        rating: r.rating,
        count: parseInt(r.count)
      }))
    };

    await setCache(cacheKey, JSON.stringify(analytics), 3600);

    return analytics;
  } catch (error) {
    logger.error('Failed to get place analytics', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

/**
 * Get visitor statistics for date range
 */
export async function getVisitorStats(placeId: string, startDate: string, endDate: string): Promise<VisitorStats[]> {
  try {
    const results = await queryRows(
      `SELECT
        DATE(created_at) as date,
        COUNT(*) as visitor_count,
        COUNT(DISTINCT user_id) as unique_visitors
       FROM place_visits
       WHERE place_id = $1 AND created_at BETWEEN $2 AND $3
       GROUP BY DATE(created_at)
       ORDER BY date DESC`,
      [placeId, startDate, endDate]
    );

    return results.map((r: any) => ({
      date: r.date,
      visitorCount: parseInt(r.visitor_count),
      uniqueVisitors: parseInt(r.unique_visitors)
    }));
  } catch (error) {
    logger.error('Failed to get visitor stats', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

/**
 * Get review analysis
 */
export async function getReviewAnalysis(placeId: string): Promise<ReviewAnalysis> {
  try {
    const stats = await queryOne(
      `SELECT
        COUNT(*) as total_reviews,
        AVG(rating) as average_rating,
        SUM(CASE WHEN rating >= 4 THEN 1 ELSE 0 END) as positive_count,
        SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END) as neutral_count,
        SUM(CASE WHEN rating < 3 THEN 1 ELSE 0 END) as negative_count
       FROM reviews WHERE place_id = $1`,
      [placeId]
    );

    const recentReviews = await queryRows(
      `SELECT id, user_id, rating, comment, created_at FROM reviews
       WHERE place_id = $1 ORDER BY created_at DESC LIMIT 5`,
      [placeId]
    );

    return {
      totalReviews: parseInt(stats?.total_reviews || '0'),
      averageRating: parseFloat(stats?.average_rating || '0'),
      positiveCount: parseInt(stats?.positive_count || '0'),
      neutralCount: parseInt(stats?.neutral_count || '0'),
      negativeCount: parseInt(stats?.negative_count || '0'),
      topKeywords: [],
      recentReviews: recentReviews
    };
  } catch (error) {
    logger.error('Failed to get review analysis', error instanceof Error ? error : new Error(String(error)));
    return {
      totalReviews: 0,
      averageRating: 0,
      positiveCount: 0,
      neutralCount: 0,
      negativeCount: 0,
      topKeywords: [],
      recentReviews: []
    };
  }
}

/**
 * Get promotion performance metrics
 */
export async function getPromotionPerformance(promotionId: string): Promise<PromotionMetrics | null> {
  try {
    const promotion = await queryOne(
      'SELECT id, title, discount_value FROM promotions WHERE id = $1',
      [promotionId]
    );

    if (!promotion) {
      return null;
    }

    const redemptions = await queryOne(
      `SELECT COUNT(*) as count, SUM(discount_amount) as total_savings
       FROM promotion_redemptions WHERE promotion_id = $1`,
      [promotionId]
    );

    return {
      promotionId,
      title: promotion.title,
      discountValue: promotion.discount_value,
      totalRedemptions: parseInt(redemptions?.count || '0'),
      totalSavings: parseFloat(redemptions?.total_savings || '0'),
      conversionRate: 0,
      averageOrderValue: 0
    };
  } catch (error) {
    logger.error('Failed to get promotion performance', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

/**
 * Get event statistics
 */
export async function getEventStats(placeId: string): Promise<any> {
  try {
    const events = await queryRows(
      `SELECT id, title, start_date, attendee_count, capacity
       FROM events WHERE place_id = $1 AND start_date > NOW()
       ORDER BY start_date ASC`,
      [placeId]
    );

    const pastEvents = await queryRows(
      `SELECT id, title, start_date, attendee_count, capacity
       FROM events WHERE place_id = $1 AND start_date <= NOW()
       ORDER BY start_date DESC LIMIT 10`,
      [placeId]
    );

    return {
      upcomingCount: events.length,
      pastCount: pastEvents.length,
      upcomingEvents: events,
      pastEvents: pastEvents,
      averageAttendanceRate: pastEvents.length > 0
        ? pastEvents.reduce((sum: number, e: any) => sum + ((e.attendee_count || 0) / (e.capacity || 1) * 100), 0) / pastEvents.length
        : 0
    };
  } catch (error) {
    logger.error('Failed to get event stats', error instanceof Error ? error : new Error(String(error)));
    return {
      upcomingCount: 0,
      pastCount: 0,
      upcomingEvents: [],
      pastEvents: [],
      averageAttendanceRate: 0
    };
  }
}

/**
 * Record analytics snapshot (hourly aggregation)
 */
export async function recordAnalyticsSnapshot(placeId: string, metrics: any): Promise<boolean> {
  try {
    const today = new Date().toISOString().split('T')[0];

    await insert('analytics_snapshots', {
      place_id: placeId,
      metric_date: today,
      metric_type: 'daily',
      ...metrics
    });

    // Invalidate cache
    await deleteCache(`sanliurfa:analytics:place:${placeId}:30`);

    logger.info('Analytics snapshot recorded', { placeId });
    return true;
  } catch (error) {
    logger.error('Failed to record analytics snapshot', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

/**
 * Get analytics summary report
 */
export async function generateAnalyticsReport(placeId: string, startDate: string, endDate: string): Promise<any> {
  try {
    const placeAnalytics = await getPlaceAnalytics(placeId, 30);
    const visitorStats = await getVisitorStats(placeId, startDate, endDate);
    const reviewAnalysis = await getReviewAnalysis(placeId);
    const eventStats = await getEventStats(placeId);

    const totalVisitors = visitorStats.reduce((sum, v) => sum + v.visitorCount, 0);
    const avgVisitorsPerDay = visitorStats.length > 0 ? totalVisitors / visitorStats.length : 0;

    return {
      period: { startDate, endDate },
      placeAnalytics,
      visitorStats,
      reviewAnalysis,
      eventStats,
      summary: {
        totalVisitors,
        averageVisitorsPerDay: avgVisitorsPerDay,
        totalReviews: reviewAnalysis.totalReviews,
        averageRating: reviewAnalysis.averageRating,
        promotionCount: placeAnalytics?.promotionCount,
        eventCount: placeAnalytics?.eventCount
      },
      generatedAt: new Date().toISOString()
    };
  } catch (error) {
    logger.error('Failed to generate analytics report', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

/**
 * Get place daily metrics
 */
export async function getPlaceDailyMetrics(placeId: string, days: number = 30): Promise<any[]> {
  try {
    const cacheKey = `sanliurfa:metrics:daily:${placeId}:${days}`;
    const cached = await getCache(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const metrics = await queryRows(`
      SELECT
        date,
        view_count,
        click_count,
        review_count,
        average_rating,
        new_followers,
        booking_inquiries
      FROM place_daily_metrics
      WHERE place_id = $1
      AND date >= NOW()::DATE - INTERVAL '1 day' * $2
      ORDER BY date DESC
      LIMIT 100
    `, [placeId, days]);

    if (metrics.length > 0) {
      await setCache(cacheKey, JSON.stringify(metrics), 3600);
    }

    return metrics;
  } catch (error) {
    logger.error('Failed to get daily metrics', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

/**
 * Get dashboard overview
 */
export async function getDashboardOverview(placeId: string): Promise<any | null> {
  try {
    const cacheKey = `sanliurfa:dashboard:overview:${placeId}`;
    const cached = await getCache(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const overview = await queryOne(`
      SELECT
        (SELECT COUNT(*) FROM place_daily_metrics WHERE place_id = $1) as total_records,
        (SELECT SUM(view_count) FROM place_daily_metrics WHERE place_id = $1) as total_views,
        (SELECT COUNT(*) FROM reviews WHERE place_id = $1) as total_reviews,
        (SELECT AVG(rating) FROM reviews WHERE place_id = $1) as avg_rating,
        (SELECT COUNT(*) FROM favorites WHERE place_id = $1) as total_favorites,
        (SELECT COUNT(*) FROM place_interactions WHERE place_id = $1) as total_interactions
    `, [placeId]);

    if (overview) {
      await setCache(cacheKey, JSON.stringify(overview), 1800);
    }

    return overview;
  } catch (error) {
    logger.error('Failed to get dashboard overview', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

/**
 * Get top performing places
 */
export async function getTopPerformingPlaces(limit: number = 10): Promise<any[]> {
  try {
    const results = await queryRows(
      `SELECT
        p.id,
        p.title,
        p.rating,
        COUNT(DISTINCT pv.id) as visitor_count,
        COUNT(DISTINCT r.id) as review_count,
        COUNT(DISTINCT e.id) as event_count,
        COUNT(DISTINCT pr.id) as promotion_count
       FROM places p
       LEFT JOIN place_visits pv ON p.id = pv.place_id
       LEFT JOIN reviews r ON p.id = r.place_id
       LEFT JOIN events e ON p.id = e.place_id AND e.start_date > NOW()
       LEFT JOIN promotions pr ON p.id = pr.place_id AND pr.is_active = true
       GROUP BY p.id, p.title, p.rating
       ORDER BY p.rating DESC, visitor_count DESC
       LIMIT $1`,
      [limit]
    );

    return results.map((r: any) => ({
      id: r.id,
      title: r.title,
      rating: r.rating,
      visitorCount: parseInt(r.visitor_count || '0'),
      reviewCount: parseInt(r.review_count || '0'),
      eventCount: parseInt(r.event_count || '0'),
      promotionCount: parseInt(r.promotion_count || '0')
    }));
  } catch (error) {
    logger.error('Failed to get top performing places', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

// ===== Advanced Analytics (KPI, Dashboards, Reports) =====

export interface KPIDefinition {
  id: string;
  key: string;
  name: string;
  description?: string;
  formula?: string;
  unit?: string;
  target_value?: number;
  alert_threshold?: number;
  category?: string;
  owner_id?: string;
  is_active: boolean;
}

export interface KPIValue {
  id: string;
  kpi_id: string;
  value: number;
  target_value?: number;
  period_date: string;
  period_type: string;
  is_final: boolean;
}

export interface BusinessMetrics {
  id: string;
  metric_date: string;
  revenue: number;
  user_count: number;
  active_users: number;
  new_users: number;
  engagement_rate: number;
  churn_rate: number;
  retention_rate: number;
  conversion_rate: number;
  avg_session_duration: number;
  page_views: number;
  bounce_rate: number;
}

export interface Dashboard {
  id: string;
  name: string;
  description?: string;
  owner_id: string;
  is_public: boolean;
  layout?: any;
  widgets?: any;
  refresh_interval: number;
}

export interface Report {
  id: string;
  name: string;
  description?: string;
  owner_id: string;
  report_type?: string;
  metric_ids?: string[];
  filters?: any;
  schedule?: string;
  next_run_at?: string;
  format: string;
  recipients?: string[];
  is_active: boolean;
}

/**
 * Define a new KPI
 */
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
