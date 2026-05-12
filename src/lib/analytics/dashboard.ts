/**
 * Enhanced Analytics Dashboard Module
 * Comprehensive analytics for platform insights
 */

import { query } from '../postgres';

export interface TimeRange {
  start: Date;
  end: Date;
}

export interface DashboardMetrics {
  users: UserMetrics;
  places: PlaceMetrics;
  content: ContentMetrics;
  engagement: EngagementMetrics;
  performance: PerformanceMetrics;
}

export interface UserMetrics {
  totalUsers: number;
  newUsers: number;
  activeUsers: number;
  returningUsers: number;
  churnRate: number;
  byDevice: Record<string, number>;
  byLocation: Record<string, number>;
  growthRate: number;
}

export interface PlaceMetrics {
  totalPlaces: number;
  newPlaces: number;
  byCategory: Record<string, number>;
  topRated: Array<{ id: string; name: string; rating: number; reviews: number }>;
  mostViewed: Array<{ id: string; name: string; views: number }>;
  pendingApprovals: number;
}

export interface ContentMetrics {
  totalReviews: number;
  newReviews: number;
  totalComments: number;
  totalPhotos: number;
  avgRating: number;
  ratingDistribution: Record<number, number>;
  flaggedContent: number;
}

export interface EngagementMetrics {
  avgSessionDuration: number;
  pagesPerSession: number;
  bounceRate: number;
  searchQueries: number;
  clickThroughRate: number;
  socialShares: number;
  favoritesAdded: number;
}

export interface PerformanceMetrics {
  avgPageLoadTime: number;
  apiResponseTime: number;
  errorRate: number;
  uptime: number;
  cacheHitRate: number;
}

export interface RealtimeMetrics {
  activeUsers: number;
  activeSessions: number;
  pageViewsPerMinute: number;
  topPages: Array<{ path: string; views: number }>;
  geoDistribution: Array<{ country: string; users: number }>;
}

/**
 * Get dashboard metrics
 */
export async function getDashboardMetrics(timeRange: TimeRange): Promise<DashboardMetrics> {
  const [users, places, content, engagement, performance] = await Promise.all([
    getUserMetrics(timeRange),
    getPlaceMetrics(timeRange),
    getContentMetrics(timeRange),
    getEngagementMetrics(timeRange),
    getPerformanceMetrics(timeRange),
  ]);

  return { users, places, content, engagement, performance };
}

/**
 * Get user metrics
 */
async function getUserMetrics(timeRange: TimeRange): Promise<UserMetrics> {
  const prevStart = new Date(timeRange.start.getTime() - (timeRange.end.getTime() - timeRange.start.getTime()));
  const churnCutoff = new Date(timeRange.start.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [result, prevPeriodResult, deviceResult, locationResult, churnResult] = await Promise.all([
    query(
      `SELECT
        COUNT(*) as total_users,
        COUNT(*) FILTER (WHERE created_at >= $1 AND created_at <= $2) as new_users,
        COUNT(*) FILTER (WHERE last_login_at >= $1) as active_users,
        COUNT(*) FILTER (WHERE created_at < $1 AND last_login_at >= $1) as returning_users
      FROM users
      WHERE deleted_at IS NULL`,
      [timeRange.start, timeRange.end]
    ),
    query(
      `SELECT COUNT(*) as prev_new_users
      FROM users
      WHERE created_at >= $1 AND created_at < $2 AND deleted_at IS NULL`,
      [prevStart, timeRange.start]
    ),
    query(
      `SELECT device_type, COUNT(*) as count
      FROM user_sessions
      WHERE created_at >= $1 AND created_at <= $2
      GROUP BY device_type`,
      [timeRange.start, timeRange.end]
    ),
    query(
      `SELECT country, COUNT(*) as count
      FROM user_sessions
      WHERE created_at >= $1 AND created_at <= $2 AND country IS NOT NULL
      GROUP BY country
      ORDER BY count DESC
      LIMIT 10`,
      [timeRange.start, timeRange.end]
    ),
    query(
      `SELECT COUNT(*) as churned
      FROM users
      WHERE last_login_at < $1 AND created_at < $1 AND deleted_at IS NULL`,
      [churnCutoff]
    ),
  ]);

  const totalUsers = parseInt(result.rows[0].total_users, 10);
  const newUsers = parseInt(result.rows[0].new_users, 10);
  const prevNewUsers = parseInt(prevPeriodResult.rows[0]?.prev_new_users || '0', 10);
  const growthRate = prevNewUsers > 0 ? ((newUsers - prevNewUsers) / prevNewUsers) * 100 : 0;

  const byDevice: Record<string, number> = {};
  deviceResult.rows.forEach(row => {
    byDevice[row.device_type] = parseInt(row.count, 10);
  });

  const byLocation: Record<string, number> = {};
  locationResult.rows.forEach(row => {
    byLocation[row.country] = parseInt(row.count, 10);
  });

  const churnRate = totalUsers > 0 ? (parseInt(churnResult.rows[0].churned, 10) / totalUsers) * 100 : 0;

  return {
    totalUsers,
    newUsers,
    activeUsers: parseInt(result.rows[0].active_users, 10),
    returningUsers: parseInt(result.rows[0].returning_users, 10),
    churnRate,
    byDevice,
    byLocation,
    growthRate,
  };
}

/**
 * Get place metrics
 */
async function getPlaceMetrics(timeRange: TimeRange): Promise<PlaceMetrics> {
  const [result, categoryResult, topRatedResult, mostViewedResult] = await Promise.all([
    query(
      `SELECT
        COUNT(*) as total_places,
        COUNT(*) FILTER (WHERE created_at >= $1 AND created_at <= $2) as new_places,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_approvals
      FROM places`,
      [timeRange.start, timeRange.end]
    ),
    query(
      `SELECT category_id, COUNT(*) as count
      FROM places
      GROUP BY category_id`,
      []
    ),
    query(
      `SELECT id, name, rating, review_count
      FROM places
      WHERE review_count > 5
      ORDER BY rating DESC, review_count DESC
      LIMIT 10`,
      []
    ),
    query(
      `SELECT p.id, p.name, COUNT(pv.id) as views
      FROM places p
      JOIN page_views pv ON pv.path = '/mekanlar/' || p.slug
      WHERE pv.created_at >= $1 AND pv.created_at <= $2
      GROUP BY p.id, p.name
      ORDER BY views DESC
      LIMIT 10`,
      [timeRange.start, timeRange.end]
    ),
  ]);

  const byCategory: Record<string, number> = {};
  categoryResult.rows.forEach(row => {
    byCategory[row.category_id] = parseInt(row.count, 10);
  });

  const topRated = topRatedResult.rows.map(row => ({
    id: row.id,
    name: row.name,
    rating: parseFloat(row.rating),
    reviews: parseInt(row.review_count, 10),
  }));

  const mostViewed = mostViewedResult.rows.map(row => ({
    id: row.id,
    name: row.name,
    views: parseInt(row.views, 10),
  }));

  return {
    totalPlaces: parseInt(result.rows[0].total_places, 10),
    newPlaces: parseInt(result.rows[0].new_places, 10),
    byCategory,
    topRated,
    mostViewed,
    pendingApprovals: parseInt(result.rows[0].pending_approvals, 10),
  };
}

/**
 * Get content metrics
 */
async function getContentMetrics(timeRange: TimeRange): Promise<ContentMetrics> {
  const [result, ratingDistResult] = await Promise.all([
    query(
      `SELECT
        (SELECT COUNT(*) FROM reviews) as total_reviews,
        (SELECT COUNT(*) FROM reviews WHERE created_at >= $1 AND created_at <= $2) as new_reviews,
        (SELECT COUNT(*) FROM blog_comments) as total_comments,
        (SELECT COUNT(*) FROM place_photos) as total_photos,
        (SELECT AVG(rating) FROM reviews) as avg_rating,
        (SELECT COUNT(*) FROM moderation_queue WHERE status = 'pending') as flagged_content`,
      [timeRange.start, timeRange.end]
    ),
    query(
      `SELECT rating, COUNT(*) as count
      FROM reviews
      GROUP BY rating
      ORDER BY rating`,
      []
    ),
  ]);

  const ratingDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  ratingDistResult.rows.forEach(row => {
    ratingDistribution[parseInt(row.rating, 10)] = parseInt(row.count, 10);
  });

  return {
    totalReviews: parseInt(result.rows[0].total_reviews, 10),
    newReviews: parseInt(result.rows[0].new_reviews, 10),
    totalComments: parseInt(result.rows[0].total_comments, 10),
    totalPhotos: parseInt(result.rows[0].total_photos, 10),
    avgRating: parseFloat(result.rows[0].avg_rating) || 0,
    ratingDistribution,
    flaggedContent: parseInt(result.rows[0].flagged_content, 10),
  };
}

/**
 * Get engagement metrics
 */
async function getEngagementMetrics(timeRange: TimeRange): Promise<EngagementMetrics> {
  // 5 bağımsız sorgu paralel; ctr `result.total_page_views`'a bağlı, ayrı round-trip
  const [result, bounceResult, searchResult, favoritesResult, sharesResult] = await Promise.all([
    query(
      `SELECT
        AVG(duration_ms) as avg_duration,
        COUNT(DISTINCT session_id) as total_sessions,
        COUNT(*) as total_page_views
      FROM page_views
      WHERE created_at >= $1 AND created_at <= $2`,
      [timeRange.start, timeRange.end]
    ),
    query(
      `SELECT
        COUNT(*) FILTER (WHERE page_count = 1) as bounced_sessions,
        COUNT(*) as total_sessions
      FROM (
        SELECT session_id, COUNT(*) as page_count
        FROM page_views
        WHERE created_at >= $1 AND created_at <= $2
        GROUP BY session_id
      ) sessions`,
      [timeRange.start, timeRange.end]
    ),
    query(
      `SELECT COUNT(*) as search_queries
      FROM search_logs
      WHERE created_at >= $1 AND created_at <= $2`,
      [timeRange.start, timeRange.end]
    ),
    query(
      `SELECT COUNT(*) as favorites_added
      FROM user_favorites
      WHERE created_at >= $1 AND created_at <= $2`,
      [timeRange.start, timeRange.end]
    ),
    query(
      `SELECT COUNT(*) as social_shares
      FROM social_shares
      WHERE created_at >= $1 AND created_at <= $2`,
      [timeRange.start, timeRange.end]
    ),
  ]);

  const bounceRate = parseInt(bounceResult.rows[0].total_sessions, 10) > 0
    ? (parseInt(bounceResult.rows[0].bounced_sessions, 10) / parseInt(bounceResult.rows[0].total_sessions, 10)) * 100
    : 0;

  const totalSessions = parseInt(result.rows[0].total_sessions, 10);
  const totalPageViews = parseInt(result.rows[0].total_page_views, 10);

  // Click-through rate: click events / page views (ayrı round-trip — totalPageViews dependency)
  const ctrResult = await query(
    `SELECT
      (COUNT(*) FILTER (WHERE event_type = 'click'))::float /
      NULLIF($3::bigint, 0) * 100 as ctr
     FROM engagement_events
     WHERE created_at >= $1 AND created_at <= $2`,
    [timeRange.start, timeRange.end, totalPageViews]
  );
  const clickThroughRate = Math.round(parseFloat(ctrResult.rows[0].ctr) * 10) / 10 || 0;

  return {
    avgSessionDuration: Math.round(parseFloat(result.rows[0].avg_duration) / 1000) || 0,
    pagesPerSession: totalSessions > 0 ? Math.round((totalPageViews / totalSessions) * 10) / 10 : 0,
    bounceRate,
    searchQueries: parseInt(searchResult.rows[0].search_queries, 10),
    clickThroughRate,
    socialShares: parseInt(sharesResult.rows[0].social_shares, 10),
    favoritesAdded: parseInt(favoritesResult.rows[0].favorites_added, 10),
  };
}

/**
 * Get performance metrics
 */
async function getPerformanceMetrics(timeRange: TimeRange): Promise<PerformanceMetrics> {
  // Get from metrics/logs table
  const result = await query(
    `SELECT 
      AVG(response_time_ms) as avg_response_time,
      COUNT(*) FILTER (WHERE status >= 500) as error_5xx,
      COUNT(*) FILTER (WHERE status >= 400) as error_4xx,
      COUNT(*) as total_requests
    FROM api_request_logs
    WHERE created_at >= $1 AND created_at <= $2`,
    [timeRange.start, timeRange.end]
  );

  const totalRequests = parseInt(result.rows[0].total_requests, 10);
  const error5xx = parseInt(result.rows[0].error_5xx, 10);
  const errorRequests = error5xx + parseInt(result.rows[0].error_4xx, 10);
  const uptime = totalRequests > 0
    ? Math.round((1 - error5xx / totalRequests) * 1000) / 10
    : 100;

  return {
    avgPageLoadTime: Math.round(parseFloat(result.rows[0].avg_response_time)) || 0,
    apiResponseTime: Math.round(parseFloat(result.rows[0].avg_response_time)) || 0,
    errorRate: totalRequests > 0 ? (errorRequests / totalRequests) * 100 : 0,
    uptime,
    cacheHitRate: 0,
  };
}

/**
 * Get realtime metrics
 */
export async function getRealtimeMetrics(): Promise<RealtimeMetrics> {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

  const [activeResult, sessionsResult, pageViewsResult, topPagesResult, geoResult] = await Promise.all([
    query(
      `SELECT COUNT(DISTINCT user_id) as active_users
      FROM user_sessions
      WHERE last_activity_at >= $1`,
      [fiveMinutesAgo]
    ),
    query(
      `SELECT COUNT(*) as active_sessions
      FROM user_sessions
      WHERE last_activity_at >= $1`,
      [fiveMinutesAgo]
    ),
    query(
      `SELECT COUNT(*) as views
      FROM page_views
      WHERE created_at >= $1`,
      [fiveMinutesAgo]
    ),
    query(
      `SELECT path, COUNT(*) as views
      FROM page_views
      WHERE created_at >= $1
      GROUP BY path
      ORDER BY views DESC
      LIMIT 10`,
      [fiveMinutesAgo]
    ),
    query(
      `SELECT country, COUNT(DISTINCT user_id) as users
      FROM user_sessions
      WHERE last_activity_at >= $1 AND country IS NOT NULL
      GROUP BY country
      ORDER BY users DESC
      LIMIT 10`,
      [fiveMinutesAgo]
    ),
  ]);

  return {
    activeUsers: parseInt(activeResult.rows[0].active_users, 10),
    activeSessions: parseInt(sessionsResult.rows[0].active_sessions, 10),
    pageViewsPerMinute: Math.round(parseInt(pageViewsResult.rows[0].views, 10) / 5),
    topPages: topPagesResult.rows.map(row => ({ path: row.path, views: parseInt(row.views, 10) })),
    geoDistribution: geoResult.rows.map(row => ({ country: row.country, users: parseInt(row.users, 10) })),
  };
}

/**
 * Get time series data
 */
export async function getTimeSeriesData(
  metric: 'users' | 'places' | 'reviews' | 'pageviews',
  timeRange: TimeRange,
  granularity: 'hour' | 'day' | 'week' | 'month' = 'day'
): Promise<Array<{ timestamp: Date; value: number }>> {
  let query_str = '';

  switch (metric) {
    case 'users':
      query_str = `
        SELECT date_trunc($3, created_at) as timestamp, COUNT(*) as value
        FROM users
        WHERE created_at >= $1 AND created_at <= $2
        GROUP BY date_trunc($3, created_at)
        ORDER BY timestamp`;
      break;
    case 'places':
      query_str = `
        SELECT date_trunc($3, created_at) as timestamp, COUNT(*) as value
        FROM places
        WHERE created_at >= $1 AND created_at <= $2
        GROUP BY date_trunc($3, created_at)
        ORDER BY timestamp`;
      break;
    case 'reviews':
      query_str = `
        SELECT date_trunc($3, created_at) as timestamp, COUNT(*) as value
        FROM reviews
        WHERE created_at >= $1 AND created_at <= $2
        GROUP BY date_trunc($3, created_at)
        ORDER BY timestamp`;
      break;
    case 'pageviews':
      query_str = `
        SELECT date_trunc($3, created_at) as timestamp, COUNT(*) as value
        FROM page_views
        WHERE created_at >= $1 AND created_at <= $2
        GROUP BY date_trunc($3, created_at)
        ORDER BY timestamp`;
      break;
  }

  const result = await query(query_str, [timeRange.start, timeRange.end, granularity]);

  return result.rows.map(row => ({
    timestamp: new Date(row.timestamp),
    value: parseInt(row.value, 10),
  }));
}
