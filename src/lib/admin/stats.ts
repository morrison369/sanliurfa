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
      (SELECT COUNT(DISTINCT user_id) FROM user_sessions WHERE last_active >= $1) as active_users_today`,
    [since]
  );

  const row = result.rows[0];
  return {
    totalUsers: parseInt(row.total_users),
    newUsersToday: parseInt(row.new_users_today),
    totalPlaces: parseInt(row.total_places),
    newPlacesToday: parseInt(row.new_places_today),
    totalReviews: parseInt(row.total_reviews),
    newReviewsToday: parseInt(row.new_reviews_today),
    activeUsersToday: parseInt(row.active_users_today),
  };
}

async function getUserStats(since: Date): Promise<UserStats> {
  // By tier
  const tierResult = await query(
    `SELECT COALESCE(subscription_tier, 'free') as tier, COUNT(*) as count
    FROM users WHERE deleted_at IS NULL
    GROUP BY subscription_tier`,
    []
  );
  const byTier: Record<string, number> = {};
  tierResult.rows.forEach(row => {
    byTier[row.tier] = parseInt(row.count);
  });

  // By device
  const deviceResult = await query(
    `SELECT device_type, COUNT(*) as count
    FROM user_sessions WHERE created_at >= $1
    GROUP BY device_type`,
    [since]
  );
  const byDevice: Record<string, number> = {};
  deviceResult.rows.forEach(row => {
    byDevice[row.device_type] = parseInt(row.count);
  });

  // By country
  const countryResult = await query(
    `SELECT country, COUNT(*) as count
    FROM user_sessions WHERE created_at >= $1 AND country IS NOT NULL
    GROUP BY country
    ORDER BY count DESC
    LIMIT 10`,
    [since]
  );
  const byCountry: Record<string, number> = {};
  countryResult.rows.forEach(row => {
    byCountry[row.country] = parseInt(row.count);
  });

  // Growth 7 days
  const growthResult = await query(
    `SELECT DATE(created_at) as date, COUNT(*) as count
    FROM users WHERE created_at >= NOW() - INTERVAL '7 days'
    GROUP BY DATE(created_at)
    ORDER BY date`,
    []
  );
  const growth7Days = growthResult.rows.map(r => parseInt(r.count));

  // Retention rate
  const retentionResult = await query(
    `SELECT 
      COUNT(DISTINCT user_id) as active_users,
      (SELECT COUNT(*) FROM users WHERE created_at < $1 AND deleted_at IS NULL) as total_users
    FROM user_sessions
    WHERE last_active >= $1`,
    [new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)]
  );
  const totalUsers = parseInt(retentionResult.rows[0].total_users);
  const retentionRate = totalUsers > 0
    ? (parseInt(retentionResult.rows[0].active_users) / totalUsers) * 100
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
  // Places by category
  const categoryResult = await query(
    `SELECT category_id, COUNT(*) as count
    FROM places GROUP BY category_id`,
    []
  );
  const placesByCategory: Record<string, number> = {};
  categoryResult.rows.forEach(row => {
    placesByCategory[row.category_id] = parseInt(row.count);
  });

  // Places by status
  const statusResult = await query(
    `SELECT status, COUNT(*) as count FROM places GROUP BY status`,
    []
  );
  const placesByStatus: Record<string, number> = {};
  statusResult.rows.forEach(row => {
    placesByStatus[row.status] = parseInt(row.count);
  });

  // Reviews by rating
  const ratingResult = await query(
    `SELECT rating, COUNT(*) as count FROM reviews GROUP BY rating`,
    []
  );
  const reviewsByRating: Record<string, number> = {};
  ratingResult.rows.forEach(row => {
    reviewsByRating[row.rating] = parseInt(row.count);
  });

  // Top viewed places
  const topViewedResult = await query(
    `SELECT p.id, p.name, COUNT(pv.id) as views
    FROM places p
    LEFT JOIN page_views pv ON pv.path LIKE '/mekanlar/' || p.slug || '%'
    WHERE pv.created_at >= $1
    GROUP BY p.id, p.name
    ORDER BY views DESC
    LIMIT 10`,
    [since]
  );

  // Top rated places
  const topRatedResult = await query(
    `SELECT id, name, rating
    FROM places
    WHERE review_count > 5
    ORDER BY rating DESC
    LIMIT 10`,
    []
  );

  // Pending approvals
  const pendingResult = await query(
    `SELECT COUNT(*) FROM places WHERE status = 'pending'`
  );

  return {
    placesByCategory,
    placesByStatus,
    reviewsByRating,
    topViewedPlaces: topViewedResult.rows,
    topRatedPlaces: topRatedResult.rows.map(r => ({ ...r, rating: parseFloat(r.rating) })),
    pendingApprovals: parseInt(pendingResult.rows[0].count),
  };
}

async function getEngagementStats(since: Date): Promise<EngagementStats> {
  const result = await query(
    `SELECT 
      AVG(duration_ms) as avg_duration,
      COUNT(*) FILTER (WHERE event_type = 'search') as searches,
      COUNT(*) FILTER (WHERE event_type = 'share') as shares,
      COUNT(*) FILTER (WHERE event_type = 'favorite') as favorites
    FROM analytics_events
    WHERE created_at >= $1`,
    [since]
  );

  const bounceResult = await query(
    `SELECT 
      COUNT(*) FILTER (WHERE page_count = 1) as bounced,
      COUNT(*) as total
    FROM (
      SELECT session_id, COUNT(*) as page_count
      FROM page_views WHERE created_at >= $1
      GROUP BY session_id
    ) sessions`,
    [since]
  );

  const total = parseInt(bounceResult.rows[0].total);
  const bounced = parseInt(bounceResult.rows[0].bounced);

  return {
    avgSessionDuration: Math.round(parseFloat(result.rows[0].avg_duration) / 1000) || 0,
    avgPagesPerSession: 0,
    bounceRate: total > 0 ? (bounced / total) * 100 : 0,
    searchesToday: parseInt(result.rows[0].searches) || 0,
    sharesToday: parseInt(result.rows[0].shares) || 0,
    favoritesToday: parseInt(result.rows[0].favorites) || 0,
  };
}

async function getModerationStats(since: Date): Promise<ModerationStats> {
  const result = await query(
    `SELECT 
      COUNT(*) FILTER (WHERE status = 'pending') as pending_reports,
      COUNT(*) FILTER (WHERE status = 'flagged') as flagged_content,
      COUNT(*) FILTER (WHERE is_banned = true) as banned_users,
      COUNT(*) FILTER (WHERE moderated_at >= $1) as moderated_today,
      COUNT(*) FILTER (WHERE is_auto_moderated = true AND moderated_at >= $1) as auto_moderated
    FROM (
      SELECT status, NULL as is_banned, NULL as moderated_at, NULL as is_auto_moderated
      FROM content_reports WHERE status = 'pending'
      UNION ALL
      SELECT status, NULL, NULL, NULL FROM comments WHERE status = 'flagged'
      UNION ALL
      SELECT NULL, is_banned, NULL, NULL FROM users WHERE is_banned = true
      UNION ALL
      SELECT NULL, NULL, moderated_at, is_auto_moderated FROM moderation_queue
    ) combined`,
    [since]
  );

  const row = result.rows[0];
  return {
    pendingReports: parseInt(row.pending_reports) || 0,
    flaggedContent: parseInt(row.flagged_content) || 0,
    bannedUsers: parseInt(row.banned_users) || 0,
    moderatedToday: parseInt(row.moderated_today) || 0,
    autoModerated: parseInt(row.auto_moderated) || 0,
  };
}

async function getSystemStats(): Promise<SystemStats> {
  // These would typically come from monitoring systems
  return {
    uptime: 99.9,
    avgResponseTime: 120,
    errorRate: 0.1,
    storageUsed: 0,
    activeConnections: 0,
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
      (SELECT COUNT(DISTINCT user_id) FROM user_sessions WHERE last_active >= $1) as current_users,
      (SELECT COUNT(*) FROM api_request_logs WHERE created_at >= $1) / 5 as requests_per_minute,
      (SELECT COUNT(*) FROM api_request_logs WHERE status >= 500 AND created_at >= $2) as errors_last_hour`,
    [fiveMinutesAgo, oneHourAgo]
  );

  return {
    currentUsers: parseInt(result.rows[0].current_users) || 0,
    requestsPerMinute: parseInt(result.rows[0].requests_per_minute) || 0,
    errorsLastHour: parseInt(result.rows[0].errors_last_hour) || 0,
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
      CURRENT_DATE - INTERVAL '${days} days',
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
    ORDER BY date`,
    []
  );

  return result.rows.map(row => ({
    date: row.date,
    users: parseInt(row.users),
    places: parseInt(row.places),
    reviews: parseInt(row.reviews),
  }));
}
