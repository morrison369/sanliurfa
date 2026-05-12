/**
 * Admin Dashboard Stats API
 * Comprehensive statistics for admin panel
 */

import { query } from '../postgres';

export interface AdminDashboardStats {
  overview: OverviewStats;
  users: UserStats;
  content: ContentStats;
  engagement: EngagementStats;
  moderation: ModerationStats;
  system: SystemStats;
}

export interface OverviewStats {
  totalUsers: number;
  newUsersToday: number;
  totalPlaces: number;
  newPlacesToday: number;
  totalReviews: number;
  newReviewsToday: number;
  activeUsersToday: number;
  revenueToday?: number;
}

export interface UserStats {
  byTier: Record<string, number>;
  byDevice: Record<string, number>;
  byCountry: Record<string, number>;
  growth7Days: number[];
  retentionRate: number;
  churnRate: number;
}

export interface ContentStats {
  placesByCategory: Record<string, number>;
  placesByStatus: Record<string, number>;
  reviewsByRating: Record<string, number>;
  topViewedPlaces: Array<{ id: string; name: string; views: number }>;
  topRatedPlaces: Array<{ id: string; name: string; rating: number }>;
  pendingApprovals: number;
}

export interface EngagementStats {
  avgSessionDuration: number;
  avgPagesPerSession: number;
  bounceRate: number;
  searchesToday: number;
  sharesToday: number;
  favoritesToday: number;
}

export interface ModerationStats {
  pendingReports: number;
  flaggedContent: number;
  bannedUsers: number;
  moderatedToday: number;
  autoModerated: number;
}

export interface SystemStats {
  uptime: number;
  avgResponseTime: number;
  errorRate: number;
  storageUsed: number;
  activeConnections: number;
}

/**
 * Get complete admin dashboard stats
 */
export async function getAdminDashboardStats(
  period: 'today' | 'week' | 'month' = 'today'
): Promise<AdminDashboardStats> {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfDay.getTime() - 7 * 24 * 60 * 60 * 1000);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  let startDate = startOfDay;
  if (period === 'week') startDate = startOfWeek;
  if (period === 'month') startDate = startOfMonth;

  const [
    overview,
    users,
    content,
    engagement,
    moderation,
    system,
  ] = await Promise.all([
    getOverviewStats(startDate),
    getUserStats(startDate),
    getContentStats(startDate),
    getEngagementStats(startDate),
    getModerationStats(startDate),
    getSystemStats(),
  ]);

  return { overview, users, content, engagement, moderation, system };
}

async function getOverviewStats(since: Date): Promise<OverviewStats> {
  const result = await query(
    `SELECT 
      (SELECT COUNT(*) FROM users WHERE deleted_at IS NULL) as total_users,
      (SELECT COUNT(*) FROM users WHERE created_at >= $1 AND deleted_at IS NULL) as new_users_today,
      (SELECT COUNT(*) FROM places) as total_places,
      (SELECT COUNT(*) FROM places WHERE created_at >= $1) as new_places_today,
      (SELECT COUNT(*) FROM reviews) as total_reviews,
      (SELECT COUNT(*) FROM reviews WHERE created_at >= $1) as new_reviews_today,
      (SELECT COUNT(DISTINCT user_id) FROM user_sessions WHERE last_activity_at >= $1) as active_users_today`,
    [since]
  );

  const row = result.rows[0];
  return {
    totalUsers: parseInt(row.total_users, 10),
    newUsersToday: parseInt(row.new_users_today, 10),
    totalPlaces: parseInt(row.total_places, 10),
    newPlacesToday: parseInt(row.new_places_today, 10),
    totalReviews: parseInt(row.total_reviews, 10),
    newReviewsToday: parseInt(row.new_reviews_today, 10),
    activeUsersToday: parseInt(row.active_users_today, 10),
  };
}

async function getUserStats(since: Date): Promise<UserStats> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [tierResult, deviceResult, countryResult, growthResult, retentionResult] = await Promise.all([
    query(
      `SELECT COALESCE(subscription_tier, 'free') as tier, COUNT(*) as count
      FROM users WHERE deleted_at IS NULL
      GROUP BY subscription_tier`,
      []
    ),
    query(
      `SELECT device_type, COUNT(*) as count
      FROM user_sessions WHERE created_at >= $1
      GROUP BY device_type`,
      [since]
    ),
    query(
      `SELECT country, COUNT(*) as count
      FROM user_sessions WHERE created_at >= $1 AND country IS NOT NULL
      GROUP BY country
      ORDER BY count DESC
      LIMIT 10`,
      [since]
    ),
    query(
      `SELECT DATE(created_at) as date, COUNT(*) as count
      FROM users WHERE created_at >= NOW() - INTERVAL '7 days'
      GROUP BY DATE(created_at)
      ORDER BY date`,
      []
    ),
    query(
      `SELECT
        COUNT(DISTINCT user_id) as active_users,
        (SELECT COUNT(*) FROM users WHERE created_at < $1 AND deleted_at IS NULL) as total_users
      FROM user_sessions
      WHERE last_activity_at >= $1`,
      [thirtyDaysAgo]
    ),
  ]);

  const byTier: Record<string, number> = {};
  tierResult.rows.forEach(row => {
    byTier[row.tier] = parseInt(row.count, 10);
  });

  const byDevice: Record<string, number> = {};
  deviceResult.rows.forEach(row => {
    byDevice[row.device_type] = parseInt(row.count, 10);
  });

  const byCountry: Record<string, number> = {};
  countryResult.rows.forEach(row => {
    byCountry[row.country] = parseInt(row.count, 10);
  });

  const growth7Days = growthResult.rows.map(r => parseInt(r.count, 10));

  const totalUsers = parseInt(retentionResult.rows[0].total_users, 10);
  const retentionRate = totalUsers > 0
    ? (parseInt(retentionResult.rows[0].active_users, 10) / totalUsers) * 100
    : 0;

  return {
    byTier,
    byDevice,
    byCountry,
    growth7Days,
    retentionRate,
    churnRate: 100 - retentionRate,
  };
}

async function getContentStats(since: Date): Promise<ContentStats> {
  const [categoryResult, statusResult, ratingResult, topViewedResult, topRatedResult, pendingResult] = await Promise.all([
    query(
      `SELECT category_id, COUNT(*) as count
      FROM places GROUP BY category_id`,
      []
    ),
    query(
      `SELECT status, COUNT(*) as count FROM places GROUP BY status`,
      []
    ),
    query(
      `SELECT rating, COUNT(*) as count FROM reviews GROUP BY rating`,
      []
    ),
    query(
      `SELECT p.id, p.name, COUNT(pv.id) as views
      FROM places p
      LEFT JOIN page_views pv ON pv.path LIKE '/mekanlar/' || p.slug || '%'
      WHERE pv.created_at >= $1
      GROUP BY p.id, p.name
      ORDER BY views DESC
      LIMIT 10`,
      [since]
    ),
    query(
      `SELECT id, name, rating
      FROM places
      WHERE review_count > 5
      ORDER BY rating DESC
      LIMIT 10`,
      []
    ),
    query(
      `SELECT COUNT(*) FROM places WHERE status = 'pending'`
    ),
  ]);

  const placesByCategory: Record<string, number> = {};
  categoryResult.rows.forEach(row => {
    placesByCategory[row.category_id] = parseInt(row.count, 10);
  });

  const placesByStatus: Record<string, number> = {};
  statusResult.rows.forEach(row => {
    placesByStatus[row.status] = parseInt(row.count, 10);
  });

  const reviewsByRating: Record<string, number> = {};
  ratingResult.rows.forEach(row => {
    reviewsByRating[row.rating] = parseInt(row.count, 10);
  });

  return {
    placesByCategory,
    placesByStatus,
    reviewsByRating,
    topViewedPlaces: topViewedResult.rows,
    topRatedPlaces: topRatedResult.rows.map(r => ({ ...r, rating: parseFloat(r.rating) })),
    pendingApprovals: parseInt(pendingResult.rows[0].count, 10),
  };
}

async function getEngagementStats(since: Date): Promise<EngagementStats> {
  const [result, durationResult, bounceResult] = await Promise.all([
    query(
      `SELECT
        COUNT(*) FILTER (WHERE event_type = 'search') as searches,
        COUNT(*) FILTER (WHERE event_type = 'share') as shares,
        COUNT(*) FILTER (WHERE event_type = 'favorite') as favorites
       FROM engagement_events
       WHERE created_at >= $1`,
      [since]
    ),
    query(
      `SELECT COALESCE(AVG(duration_ms), 0) as avg_duration FROM page_views WHERE created_at >= $1`,
      [since]
    ),
    query(
      `SELECT
        COUNT(*) FILTER (WHERE page_count = 1) as bounced,
        COUNT(*) as total,
        COALESCE(SUM(page_count), 0) as total_page_views
       FROM (
         SELECT session_id, COUNT(*) as page_count
         FROM page_views WHERE created_at >= $1
         GROUP BY session_id
       ) sessions`,
      [since]
    ),
  ]);

  const total = parseInt(bounceResult.rows[0].total, 10);
  const bounced = parseInt(bounceResult.rows[0].bounced, 10);
  const totalPageViews = parseInt(bounceResult.rows[0].total_page_views, 10);

  return {
    avgSessionDuration: Math.round(parseFloat(durationResult.rows[0].avg_duration) / 1000) || 0,
    avgPagesPerSession: total > 0 ? Math.round((totalPageViews / total) * 10) / 10 : 0,
    bounceRate: total > 0 ? (bounced / total) * 100 : 0,
    searchesToday: parseInt(result.rows[0].searches, 10) || 0,
    sharesToday: parseInt(result.rows[0].shares, 10) || 0,
    favoritesToday: parseInt(result.rows[0].favorites, 10) || 0,
  };
}

async function getModerationStats(since: Date): Promise<ModerationStats> {
  const result = await query(
    `SELECT
      (SELECT COUNT(*) FROM reports WHERE status = 'pending') as pending_reports,
      (SELECT COUNT(*) FROM moderation_queue WHERE status = 'pending') as flagged_content,
      (SELECT COUNT(*) FROM users WHERE is_banned = true) as banned_users,
      (SELECT COUNT(*) FROM moderation_queue WHERE status = 'resolved' AND updated_at >= $1) as moderated_today
    `,
    [since]
  );

  const row = result.rows[0];
  return {
    pendingReports: parseInt(row.pending_reports, 10) || 0,
    flaggedContent: parseInt(row.flagged_content, 10) || 0,
    bannedUsers: parseInt(row.banned_users, 10) || 0,
    moderatedToday: parseInt(row.moderated_today, 10) || 0,
    autoModerated: 0,
  };
}

async function getSystemStats(): Promise<SystemStats> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  const [perfResult, connResult, storageResult] = await Promise.all([
    query(
      `SELECT
        COALESCE(AVG(response_time_ms), 0) as avg_response_time,
        COUNT(*) FILTER (WHERE status >= 500) as error_count,
        COUNT(*) as total_count
       FROM api_request_logs
       WHERE created_at >= $1`,
      [oneHourAgo]
    ),
    query(`SELECT COUNT(*) as count FROM pg_stat_activity WHERE state = 'active'`),
    query(`SELECT pg_database_size(current_database()) as size`),
  ]);

  const totalCount = parseInt(perfResult.rows[0].total_count, 10) || 0;
  const errorCount = parseInt(perfResult.rows[0].error_count, 10) || 0;
  const avgResponseTime = Math.round(parseFloat(perfResult.rows[0].avg_response_time)) || 0;
  const errorRate = totalCount > 0 ? (errorCount / totalCount) * 100 : 0;

  return {
    uptime: Math.round((100 - errorRate) * 10) / 10,
    avgResponseTime,
    errorRate: Math.round(errorRate * 100) / 100,
    storageUsed: parseInt(storageResult.rows[0].size, 10) || 0,
    activeConnections: parseInt(connResult.rows[0].count, 10) || 0,
  };
}

/**
 * Get real-time stats for admin dashboard
 */
export async function getRealtimeAdminStats(): Promise<{
  currentUsers: number;
  requestsPerMinute: number;
  errorsLastHour: number;
}> {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  const result = await query(
    `SELECT 
      (SELECT COUNT(DISTINCT user_id) FROM user_sessions WHERE last_activity_at >= $1) as current_users,
      (SELECT COUNT(*) FROM api_request_logs WHERE created_at >= $1) / 5 as requests_per_minute,
      (SELECT COUNT(*) FROM api_request_logs WHERE status >= 500 AND created_at >= $2) as errors_last_hour`,
    [fiveMinutesAgo, oneHourAgo]
  );

  return {
    currentUsers: parseInt(result.rows[0].current_users, 10) || 0,
    requestsPerMinute: parseInt(result.rows[0].requests_per_minute, 10) || 0,
    errorsLastHour: parseInt(result.rows[0].errors_last_hour, 10) || 0,
  };
}

/**
 * Get growth chart data
 */
export async function getGrowthChartData(
  days: number = 30
): Promise<Array<{ date: string; users: number; places: number; reviews: number }>> {
  const result = await query(
    `SELECT 
      DATE(d.date) as date,
      COALESCE(u.count, 0) as users,
      COALESCE(p.count, 0) as places,
      COALESCE(r.count, 0) as reviews
    FROM generate_series(
      CURRENT_DATE - ($1 * INTERVAL '1 day'),
      CURRENT_DATE,
      INTERVAL '1 day'
    ) d(date)
    LEFT JOIN (
      SELECT DATE(created_at) as date, COUNT(*) as count
      FROM users GROUP BY DATE(created_at)
    ) u ON u.date = DATE(d.date)
    LEFT JOIN (
      SELECT DATE(created_at) as date, COUNT(*) as count
      FROM places GROUP BY DATE(created_at)
    ) p ON p.date = DATE(d.date)
    LEFT JOIN (
      SELECT DATE(created_at) as date, COUNT(*) as count
      FROM reviews GROUP BY DATE(created_at)
    ) r ON r.date = DATE(d.date)
    ORDER BY date`, [days]);

  return result.rows.map(row => ({
    date: row.date,
    users: parseInt(row.users, 10),
    places: parseInt(row.places, 10),
    reviews: parseInt(row.reviews, 10),
  }));
}
