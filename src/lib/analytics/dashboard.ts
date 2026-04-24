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
  const result = await query(
    `SELECT 
      COUNT(*) as total_users,
      COUNT(*) FILTER (WHERE created_at >= $1 AND created_at <= $2) as new_users,
      COUNT(*) FILTER (WHERE last_login_at >= $1) as active_users,
      COUNT(*) FILTER (WHERE created_at < $1 AND last_login_at >= $1) as returning_users
    FROM users
    WHERE deleted_at IS NULL`,
    [timeRange.start, timeRange.end]
  );

  const prevPeriodResult = await query(
    `SELECT COUNT(*) as prev_new_users
    FROM users
    WHERE created_at >= $1 AND created_at < $2 AND deleted_at IS NULL`,
    [
      new Date(timeRange.start.getTime() - (timeRange.end.getTime() - timeRange.start.getTime())),
      timeRange.start,
    ]
  );

  const totalUsers = parseInt(result.rows[0].total_users);
  const newUsers = parseInt(result.rows[0].new_users);
  const prevNewUsers = parseInt(prevPeriodResult.rows[0]?.prev_new_users || '0');
  const growthRate = prevNewUsers > 0 ? ((newUsers - prevNewUsers) / prevNewUsers) * 100 : 0;

  // Get device breakdown
  const deviceResult = await query(
    `SELECT device_type, COUNT(*) as count
    FROM user_sessions
    WHERE created_at >= $1 AND created_at <= $2
    GROUP BY device_type`,
    [timeRange.start, timeRange.end]
  );

  const byDevice: Record<string, number> = {};
  deviceResult.rows.forEach(row => {
    byDevice[row.device_type] = parseInt(row.count);
  });

  // Get location breakdown
  const locationResult = await query(
    `SELECT country, COUNT(*) as count
    FROM user_sessions
    WHERE created_at >= $1 AND created_at <= $2 AND country IS NOT NULL
    GROUP BY country
    ORDER BY count DESC
    LIMIT 10`,
    [timeRange.start, timeRange.end]
  );

  const byLocation: Record<string, number> = {};
  locationResult.rows.forEach(row => {
    byLocation[row.country] = parseInt(row.count);
  });

  // Calculate churn rate
  const churnResult = await query(
    `SELECT COUNT(*) as churned
    FROM users
    WHERE last_login_at < $1 AND created_at < $1 AND deleted_at IS NULL`,
    [new Date(timeRange.start.getTime() - 30 * 24 * 60 * 60 * 1000)]
  );

  const churnRate = totalUsers > 0 ? (parseInt(churnResult.rows[0].churned) / totalUsers) * 100 : 0;

  return {
    totalUsers,
    newUsers,
    activeUsers: parseInt(result.rows[0].active_users),
    returningUsers: parseInt(result.rows[0].returning_users),
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
  const result = await query(
    `SELECT 
      COUNT(*) as total_places,
      COUNT(*) FILTER (WHERE created_at >= $1 AND created_at <= $2) as new_places,
      COUNT(*) FILTER (WHERE status = 'pending') as pending_approvals
    FROM places`,
    [timeRange.start, timeRange.end]
  );

  // Get by category
  const categoryResult = await query(
    `SELECT category_id, COUNT(*) as count
    FROM places
    GROUP BY category_id`,
    []
  );

  const byCategory: Record<string, number> = {};
  categoryResult.rows.forEach(row => {
    byCategory[row.category_id] = parseInt(row.count);
  });

  // Get top rated
  const topRatedResult = await query(
    `SELECT id, name, rating, review_count
    FROM places
    WHERE review_count > 5
    ORDER BY rating DESC, review_count DESC
    LIMIT 10`,
    []
  );

  const topRated = topRatedResult.rows.map(row => ({
    id: row.id,
    name: row.name,
    rating: parseFloat(row.rating),
    reviews: parseInt(row.review_count),
  }));

  // Get most viewed
  const mostViewedResult = await query(
    `SELECT p.id, p.name, COUNT(pv.id) as views
    FROM places p
    JOIN page_views pv ON pv.path = '/mekanlar/' || p.slug
    WHERE pv.created_at >= $1 AND pv.created_at <= $2
    GROUP BY p.id, p.name
    ORDER BY views DESC
    LIMIT 10`,
    [timeRange.start, timeRange.end]
  );

  const mostViewed = mostViewedResult.rows.map(row => ({
    id: row.id,
    name: row.name,
    views: parseInt(row.views),
  }));

  return {
    totalPlaces: parseInt(result.rows[0].total_places),
    newPlaces: parseInt(result.rows[0].new_places),
    byCategory,
    topRated,
    mostViewed,
    pendingApprovals: parseInt(result.rows[0].pending_approvals),
  };
}

/**
 * Get content metrics
 */
async function getContentMetrics(timeRange: TimeRange): Promise<ContentMetrics> {
  const result = await query(
    `SELECT 
      (SELECT COUNT(*) FROM reviews) as total_reviews,
      (SELECT COUNT(*) FROM reviews WHERE created_at >= $1 AND created_at <= $2) as new_reviews,
      (SELECT COUNT(*) FROM blog_comments) as total_comments,
      (SELECT COUNT(*) FROM place_photos) as total_photos,
      (SELECT AVG(rating) FROM reviews) as avg_rating,
      (SELECT COUNT(*) FROM moderation_queue WHERE status = 'pending') as flagged_content`,
    [timeRange.start, timeRange.end]
  );

  // Get rating distribution
  const ratingDistResult = await query(
    `SELECT rating, COUNT(*) as count
    FROM reviews
    GROUP BY rating
    ORDER BY rating`,
    []
  );

  const ratingDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  ratingDistResult.rows.forEach(row => {
    ratingDistribution[parseInt(row.rating)] = parseInt(row.count);
  });

  return {
    totalReviews: parseInt(result.rows[0].total_reviews),
    newReviews: parseInt(result.rows[0].new_reviews),
    totalComments: parseInt(result.rows[0].total_comments),
    totalPhotos: parseInt(result.rows[0].total_photos),
    avgRating: parseFloat(result.rows[0].avg_rating) || 0,
    ratingDistribution,
    flaggedContent: parseInt(result.rows[0].flagged_content),
  };
}

/**
 * Get engagement metrics
 */
async function getEngagementMetrics(timeRange: TimeRange): Promise<EngagementMetrics> {
  const result = await query(
    `SELECT 
      AVG(duration_ms) as avg_duration,
      COUNT(DISTINCT session_id) as total_sessions,
      COUNT(*) as total_page_views
    FROM page_views
    WHERE created_at >= $1 AND created_at <= $2`,
    [timeRange.start, timeRange.end]
  );

  // Get bounce rate (sessions with only 1 page view)
  const bounceResult = await query(
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
  );

  const bounceRate = parseInt(bounceResult.rows[0].total_sessions) > 0
    ? (parseInt(bounceResult.rows[0].bounced_sessions) / parseInt(bounceResult.rows[0].total_sessions)) * 100
    : 0;

  // Get search queries
  const searchResult = await query(
    `SELECT COUNT(*) as search_queries
    FROM search_logs
    WHERE created_at >= $1 AND created_at <= $2`,
    [timeRange.start, timeRange.end]
  );

  // Get favorites added
  const favoritesResult = await query(
    `SELECT COUNT(*) as favorites_added
    FROM user_favorites
    WHERE created_at >= $1 AND created_at <= $2`,
    [timeRange.start, timeRange.end]
  );

  // Get social shares
  const sharesResult = await query(
    `SELECT COUNT(*) as social_shares
    FROM social_shares
    WHERE created_at >= $1 AND created_at <= $2`,
    [timeRange.start, timeRange.end]
  );

  const totalSessions = parseInt(result.rows[0].total_sessions);
  const totalPageViews = parseInt(result.rows[0].total_page_views);

  return {
    avgSessionDuration: Math.round(parseFloat(result.rows[0].avg_duration) / 1000) || 0, // in seconds
    pagesPerSession: totalSessions > 0 ? Math.round((totalPageViews / totalSessions) * 10) / 10 : 0,
    bounceRate,
    searchQueries: parseInt(searchResult.rows[0].search_queries),
    clickThroughRate: 0, // Would need search result click tracking
    socialShares: parseInt(sharesResult.rows[0].social_shares),
    favoritesAdded: parseInt(favoritesResult.rows[0].favorites_added),
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

  const totalRequests = parseInt(result.rows[0].total_requests);
  const errorRequests = parseInt(result.rows[0].error_5xx) + parseInt(result.rows[0].error_4xx);

  return {
    avgPageLoadTime: Math.round(parseFloat(result.rows[0].avg_response_time)) || 0,
    apiResponseTime: Math.round(parseFloat(result.rows[0].avg_response_time)) || 0,
    errorRate: totalRequests > 0 ? (errorRequests / totalRequests) * 100 : 0,
    uptime: 99.9, // Would need monitoring service integration
    cacheHitRate: 0, // Would need cache metrics
  };
}

/**
 * Get realtime metrics
 */
export async function getRealtimeMetrics(): Promise<RealtimeMetrics> {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

  // Active users (last 5 minutes)
  const activeResult = await query(
    `SELECT COUNT(DISTINCT user_id) as active_users
    FROM user_sessions
    WHERE last_activity_at >= $1`,
    [fiveMinutesAgo]
  );

  // Active sessions
  const sessionsResult = await query(
    `SELECT COUNT(*) as active_sessions
    FROM user_sessions
    WHERE last_activity_at >= $1`,
    [fiveMinutesAgo]
  );

  // Page views per minute
  const pageViewsResult = await query(
    `SELECT COUNT(*) as views
    FROM page_views
    WHERE created_at >= $1`,
    [fiveMinutesAgo]
  );

  // Top pages
  const topPagesResult = await query(
    `SELECT path, COUNT(*) as views
    FROM page_views
    WHERE created_at >= $1
    GROUP BY path
    ORDER BY views DESC
    LIMIT 10`,
    [fiveMinutesAgo]
  );

  // Geo distribution
  const geoResult = await query(
    `SELECT country, COUNT(DISTINCT user_id) as users
    FROM user_sessions
    WHERE last_activity_at >= $1 AND country IS NOT NULL
    GROUP BY country
    ORDER BY users DESC
    LIMIT 10`,
    [fiveMinutesAgo]
  );

  return {
    activeUsers: parseInt(activeResult.rows[0].active_users),
    activeSessions: parseInt(sessionsResult.rows[0].active_sessions),
    pageViewsPerMinute: Math.round(parseInt(pageViewsResult.rows[0].views) / 5),
    topPages: topPagesResult.rows.map(row => ({ path: row.path, views: parseInt(row.views) })),
    geoDistribution: geoResult.rows.map(row => ({ country: row.country, users: parseInt(row.users) })),
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
    value: parseInt(row.value),
  }));
}
