/**
 * Analytics Module
 * User behavior tracking, page views, events
 * Privacy-friendly, GDPR compliant
 */

import { query } from './postgres';
import { logger } from './logging';

// Check if analytics is enabled
const isEnabled = import.meta.env.ANALYTICS_ENABLED !== 'false';

// Track page view
export async function trackPageView(
  path: string,
  userId?: string,
  referrer?: string,
  userAgent?: string
): Promise<void> {
  if (!isEnabled) return;

  try {
    await query(
      `INSERT INTO page_views (path, user_id, referrer, user_agent, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [path, userId || null, referrer || null, userAgent?.slice(0, 255)]
    );
  } catch (error) {
    logger.error('Analytics error:', error);
  }
}

// Track event
export async function trackEvent(
  eventName: string,
  properties: Record<string, any> = {},
  userId?: string
): Promise<void> {
  if (!isEnabled) return;

  try {
    await query(
      `INSERT INTO events (name, properties, user_id, created_at)
       VALUES ($1, $2, $3, NOW())`,
      [eventName, JSON.stringify(properties), userId || null]
    );
  } catch (error) {
    logger.error('Analytics error:', error);
  }
}

// Track search
export async function trackSearch(
  query: string,
  resultsCount: number,
  userId?: string
): Promise<void> {
  await trackEvent('search', { query, results_count: resultsCount }, userId);
}

// Track place view
export async function trackPlaceView(
  placeId: string,
  placeName: string,
  userId?: string
): Promise<void> {
  await trackEvent('place_view', { place_id: placeId, place_name: placeName }, userId);
}

// Get popular pages
export async function getPopularPages(
  days: number = 7,
  limit: number = 10
): Promise<{ path: string; views: number }[]> {
  const result = await query(
    `SELECT path, COUNT(*)::int as views
     FROM page_views
     WHERE created_at > NOW() - ($1 * INTERVAL '1 day')
     GROUP BY path
     ORDER BY views DESC
     LIMIT $2`,
    [days, limit]
  );

  return result.rows;
}

// Get daily stats
export async function getDailyStats(
  days: number = 30
): Promise<{ date: string; page_views: number; unique_visitors: number }[]> {
  const result = await query(
    `SELECT
      DATE(created_at) as date,
      COUNT(*)::int as page_views,
      COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL)::int +
      COUNT(DISTINCT user_agent) FILTER (WHERE user_id IS NULL)::int as unique_visitors
     FROM page_views
     WHERE created_at > NOW() - ($1 * INTERVAL '1 day')
     GROUP BY DATE(created_at)
     ORDER BY date DESC`,
    [days]
  );

  return result.rows;
}

// Get top searches
export async function getTopSearches(
  days: number = 7,
  limit: number = 20
): Promise<{ query: string; count: number }[]> {
  const result = await query(
    `SELECT
      properties->>'query' as query,
      COUNT(*)::int as count
     FROM events
     WHERE name = 'search'
       AND created_at > NOW() - ($1 * INTERVAL '1 day')
     GROUP BY properties->>'query'
     ORDER BY count DESC
     LIMIT $2`,
    [days, limit]
  );

  return result.rows;
}

// Get device stats
export async function getDeviceStats(
  days: number = 7
): Promise<{ device_type: string; count: number }[]> {
  const result = await query(
    `SELECT
      CASE
        WHEN user_agent ILIKE '%mobile%' THEN 'mobile'
        WHEN user_agent ILIKE '%tablet%' THEN 'tablet'
        ELSE 'desktop'
      END as device_type,
      COUNT(*)::int as count
     FROM page_views
     WHERE created_at > NOW() - ($1 * INTERVAL '1 day')
     GROUP BY 1
     ORDER BY count DESC`,
    [days]
  );

  return result.rows;
}

// Get referrer stats
export async function getReferrerStats(
  days: number = 7,
  limit: number = 10
): Promise<{ referrer: string; count: number }[]> {
  const result = await query(
    `SELECT
      COALESCE(
        CASE
          WHEN referrer LIKE '%google%' THEN 'Google'
          WHEN referrer LIKE '%facebook%' THEN 'Facebook'
          WHEN referrer LIKE '%twitter%' OR referrer LIKE '%x.com%' THEN 'Twitter/X'
          WHEN referrer LIKE '%instagram%' THEN 'Instagram'
          ELSE 'Diğer'
        END,
        'Direkt'
      ) as referrer,
      COUNT(*)::int as count
     FROM page_views
     WHERE created_at > NOW() - ($1 * INTERVAL '1 day')
     GROUP BY 1
     ORDER BY count DESC
     LIMIT $2`,
    [days, limit]
  );

  return result.rows;
}

// Real-time stats (last 5 minutes)
export async function getRealtimeStats(): Promise<{
  active_users: number;
  page_views_last_5min: number;
}> {
  const result = await query(
    `SELECT 
      COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL)::int +
      COUNT(DISTINCT user_agent) FILTER (WHERE user_id IS NULL)::int as active_users,
      COUNT(*)::int as page_views_last_5min
     FROM page_views
     WHERE created_at > NOW() - INTERVAL '5 minutes'`,
    []
  );

  return result.rows[0] || { active_users: 0, page_views_last_5min: 0 };
}

// Admin dashboard stats
export async function getAdminStats(): Promise<{
  today_views: number;
  this_week_views: number;
  this_month_views: number;
  unique_users_today: number;
}> {
  const result = await query(
    `SELECT 
      COUNT(*) FILTER (WHERE created_at > CURRENT_DATE)::int as today_views,
      COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days')::int as this_week_views,
      COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days')::int as this_month_views,
      COUNT(DISTINCT user_id) FILTER (WHERE created_at > CURRENT_DATE)::int as unique_users_today
     FROM page_views`,
    []
  );

  return result.rows[0];
}

// Client-side analytics helpers
export const clientAnalytics = {
  // Track page view from client
  async pageView(path?: string) {
    if (!isEnabled) return;
    
    try {
      await fetch('/api/analytics/pageview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: path || window.location.pathname,
          referrer: document.referrer,
        }),
      });
    } catch (error) {
      // Silent fail for analytics
    }
  },

  // Track event from client
  async event(name: string, properties?: Record<string, any>) {
    if (!isEnabled) return;
    
    try {
      await fetch('/api/analytics/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, properties }),
      });
    } catch (error) {
      // Silent fail
    }
  },

  // Track search
  async search(query: string, resultsCount: number) {
    await this.event('search', { query, results_count: resultsCount });
  },

  // Track place view
  async placeView(placeId: string, placeName: string) {
    await this.event('place_view', { place_id: placeId, place_name: placeName });
  },

  // Initialize analytics
  init() {
    // Track initial page view
    this.pageView();
    
    // Track route changes (for SPA)
    let currentPath = window.location.pathname;
    
    const observer = new MutationObserver(() => {
      if (window.location.pathname !== currentPath) {
        currentPath = window.location.pathname;
        this.pageView(currentPath);
      }
    });
    
    observer.observe(document, { subtree: true, childList: true });
    
    // Track clicks on external links
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a');
      
      if (link?.hostname !== window.location.hostname) {
        this.event('external_link_click', {
          url: link?.href,
          text: link?.textContent?.slice(0, 50),
        });
      }
    });
  },
};

// Additional exports for admin API

export async function getPlatformStats(): Promise<{
  total_users: number;
  total_places: number;
  total_reviews: number;
  total_views: number;
}> {
  const result = await query(
    `SELECT 
      (SELECT COUNT(*) FROM users)::int as total_users,
      (SELECT COUNT(*) FROM places)::int as total_places,
      (SELECT COUNT(*) FROM reviews)::int as total_reviews,
      (SELECT COUNT(*) FROM page_views)::int as total_views`,
    []
  );
  
  return result.rows[0];
}

export async function getTrendingPlacesByViews(limit = 10): Promise<Array<{
  id: string;
  name: string;
  views: number;
}>> {
  const result = await query(
    `SELECT 
      p.id,
      p.name,
      COUNT(pv.id)::int as views
     FROM places p
     LEFT JOIN page_views pv ON pv.path LIKE '/mekan/' || p.slug
     WHERE pv.created_at > NOW() - INTERVAL '7 days'
     GROUP BY p.id, p.name
     ORDER BY views DESC
     LIMIT $1`,
    [limit]
  );
  
  return result.rows;
}

export async function getSearchTrends(): Promise<Array<{
  query: string;
  count: number;
}>> {
  const result = await query(
    `SELECT 
      query,
      COUNT(*)::int as count
     FROM search_logs
     WHERE created_at > NOW() - INTERVAL '7 days'
     GROUP BY query
     ORDER BY count DESC
     LIMIT 20`,
    []
  );
  
  return result.rows;
}

// Report generation functions

export async function generateUserReport(startDate: string, endDate: string): Promise<{
  total: number;
  new: number;
  active: number;
}> {
  const result = await query(
    `SELECT 
      COUNT(*)::int as total,
      COUNT(*) FILTER (WHERE created_at BETWEEN $1 AND $2)::int as new,
      COUNT(*) FILTER (WHERE last_login_at BETWEEN $1 AND $2)::int as active
     FROM users`,
    [startDate, endDate]
  );
  
  return result.rows[0];
}

export async function generatePlacesReport(startDate: string, endDate: string): Promise<{
  total: number;
  new: number;
  byCategory: Array<{ category: string; count: number }>;
}> {
  const totalResult = await query(
    `SELECT 
      COUNT(*)::int as total,
      COUNT(*) FILTER (WHERE created_at BETWEEN $1 AND $2)::int as new
     FROM places`,
    [startDate, endDate]
  );
  
  const categoryResult = await query(
    `SELECT 
      category,
      COUNT(*)::int as count
     FROM places
     GROUP BY category
     ORDER BY count DESC`,
    []
  );
  
  return {
    ...totalResult.rows[0],
    byCategory: categoryResult.rows,
  };
}

export async function generateReviewsReport(startDate: string, endDate: string): Promise<{
  total: number;
  new: number;
  averageRating: number;
}> {
  const result = await query(
    `SELECT 
      COUNT(*)::int as total,
      COUNT(*) FILTER (WHERE created_at BETWEEN $1 AND $2)::int as new,
      COALESCE(AVG(rating), 0)::float as averageRating
     FROM reviews`,
    [startDate, endDate]
  );
  
  return result.rows[0];
}

export async function generateTrafficReport(startDate: string, endDate: string): Promise<{
  totalViews: number;
  uniqueVisitors: number;
  topPages: Array<{ path: string; views: number }>;
}> {
  const viewsResult = await query(
    `SELECT 
      COUNT(*)::int as totalViews,
      COUNT(DISTINCT user_id)::int as uniqueVisitors
     FROM page_views
     WHERE created_at BETWEEN $1 AND $2`,
    [startDate, endDate]
  );
  
  const pagesResult = await query(
    `SELECT 
      path,
      COUNT(*)::int as views
     FROM page_views
     WHERE created_at BETWEEN $1 AND $2
     GROUP BY path
     ORDER BY views DESC
     LIMIT 10`,
    [startDate, endDate]
  );
  
  return {
    ...viewsResult.rows[0],
    topPages: pagesResult.rows,
  };
}

// Additional report functions

export async function generateRevenueReport(startDate: string, endDate: string): Promise<{
  totalRevenue: number;
  reservations: number;
  averageOrder: number;
}> {
  const result = await query(
    `SELECT 
      COALESCE(SUM(amount), 0)::float as totalRevenue,
      COUNT(*)::int as reservations,
      COALESCE(AVG(amount), 0)::float as averageOrder
     FROM reservations
     WHERE status = 'confirmed'
     AND created_at BETWEEN $1 AND $2`,
    [startDate, endDate]
  );
  
  return result.rows[0] || { totalRevenue: 0, reservations: 0, averageOrder: 0 };
}

export async function generateEngagementReport(startDate: string, endDate: string): Promise<{
  totalReviews: number;
  totalFavorites: number;
  totalShares: number;
}> {
  const result = await query(
    `SELECT 
      (SELECT COUNT(*)::int FROM reviews WHERE created_at BETWEEN $1 AND $2) as totalReviews,
      (SELECT COUNT(*)::int FROM user_favorites WHERE created_at BETWEEN $1 AND $2) as totalFavorites,
      (SELECT COUNT(*)::int FROM social_shares WHERE created_at BETWEEN $1 AND $2) as totalShares`,
    [startDate, endDate]
  );
  
  return result.rows[0] || { totalReviews: 0, totalFavorites: 0, totalShares: 0 };
}

export async function getSummaryStats(): Promise<{
  users: { total: number; new: number };
  places: { total: number; pending: number };
  reviews: { total: number; pending: number };
  views: { today: number; week: number };
}> {
  const users = await query(
    `SELECT 
      COUNT(*)::int as total,
      COUNT(*) FILTER (WHERE created_at > CURRENT_DATE)::int as new
     FROM users`
  );
  
  const places = await query(
    `SELECT 
      COUNT(*)::int as total,
      COUNT(*) FILTER (WHERE status = 'pending')::int as pending
     FROM places`
  );
  
  const reviews = await query(
    `SELECT 
      COUNT(*)::int as total,
      COUNT(*) FILTER (WHERE status = 'pending')::int as pending
     FROM reviews`
  );
  
  const views = await query(
    `SELECT 
      COUNT(*) FILTER (WHERE created_at > CURRENT_DATE)::int as today,
      COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days')::int as week
     FROM page_views`
  );
  
  return {
    users: users.rows[0],
    places: places.rows[0],
    reviews: reviews.rows[0],
    views: views.rows[0],
  };
}

// Export utilities

export function reportToCSV(data: Record<string, any>[]): string {
  if (data.length === 0) return '';
  
  const headers = Object.keys(data[0]);
  const rows = data.map(row => 
    headers.map(h => {
      const val = row[h];
      if (typeof val === 'string' && val.includes(',')) {
        return `"${val}"`;
      }
      return val;
    }).join(',')
  );
  
  return [headers.join(','), ...rows].join('\n');
}

export function reportToJSON(data: Record<string, any>): string {
  return JSON.stringify(data, null, 2);
}

// Place analytics

export async function getPlaceAnalytics(placeId: string): Promise<{
  totalViews: number;
  uniqueVisitors: number;
  avgTimeOnPage: number;
  reviews: number;
  rating: number;
}> {
  const result = await query(
    `SELECT 
      COUNT(pv.id)::int as totalViews,
      COUNT(DISTINCT pv.user_id)::int as uniqueVisitors,
      COALESCE(AVG(pv.duration), 0)::float as avgTimeOnPage,
      COUNT(DISTINCT r.id)::int as reviews,
      COALESCE(AVG(r.rating), 0)::float as rating
     FROM places p
     LEFT JOIN page_views pv ON pv.path LIKE '/mekan/' || p.slug
     LEFT JOIN reviews r ON r.place_id = p.id
     WHERE p.id = $1`,
    [placeId]
  );
  
  return result.rows[0] || {
    totalViews: 0,
    uniqueVisitors: 0,
    avgTimeOnPage: 0,
    reviews: 0,
    rating: 0,
  };
}

// Analytics record functions

export async function recordPageView(data: {
  path: string;
  userId?: string;
  referrer?: string;
  userAgent?: string;
  ip?: string;
}): Promise<void> {
  await query(
    `INSERT INTO page_views (path, user_id, referrer, user_agent, ip, created_at)
     VALUES ($1, $2, $3, $4, $5, NOW())`,
    [data.path, data.userId || null, data.referrer || null, data.userAgent || null, data.ip || null]
  );
}

export async function recordInteraction(data: {
  type: string;
  element: string;
  userId?: string;
  metadata?: Record<string, any>;
}): Promise<void> {
  await query(
    `INSERT INTO interactions (type, element, user_id, metadata, created_at)
     VALUES ($1, $2, $3, $4, NOW())`,
    [data.type, data.element, data.userId || null, data.metadata ? JSON.stringify(data.metadata) : null]
  );
}

export async function recordSearch(data: {
  query: string;
  resultsCount: number;
  userId?: string;
}): Promise<void> {
  await query(
    `INSERT INTO search_logs (query, results_count, user_id, created_at)
     VALUES ($1, $2, $3, NOW())`,
    [data.query, data.resultsCount, data.userId || null]
  );
}

export async function recordPlaceView(data: {
  placeId: string;
  userId?: string;
  source?: string;
}): Promise<void> {
  await query(
    `INSERT INTO place_views (place_id, user_id, source, created_at)
     VALUES ($1, $2, $3, NOW())`,
    [data.placeId, data.userId || null, data.source || null]
  );
}


/**
 * Get user activity summary
 */
export async function getUserActivitySummary(userId: string): Promise<{
  totalReviews: number;
  totalFavorites: number;
  totalViews: number;
  lastActive: Date | null;
}> {
  const result = await query(
    `SELECT 
      (SELECT COUNT(*)::int FROM reviews WHERE user_id = $1) as totalReviews,
      (SELECT COUNT(*)::int FROM user_favorites WHERE user_id = $1) as totalFavorites,
      (SELECT COUNT(*)::int FROM page_views WHERE user_id = $1) as totalViews,
      (SELECT MAX(created_at) FROM page_views WHERE user_id = $1) as lastActive`,
    [userId]
  );
  
  const row = result.rows[0];
  return {
    totalReviews: row.totalreviews || 0,
    totalFavorites: row.totalfavorites || 0,
    totalViews: row.totalviews || 0,
    lastActive: row.lastactive ? new Date(row.lastactive) : null,
  };
}

/**
 * Get user reviews with details
 */
export async function getUserReviews(userId: string, limit = 10): Promise<Array<{
  id: string;
  placeId: string;
  placeName: string;
  rating: number;
  comment: string;
  createdAt: Date;
}>> {
  const result = await query(
    `SELECT 
      r.id,
      r.place_id as placeId,
      p.name as placeName,
      r.rating,
      r.comment,
      r.created_at as createdAt
     FROM reviews r
     JOIN places p ON r.place_id = p.id
     WHERE r.user_id = $1
     ORDER BY r.created_at DESC
     LIMIT $2`,
    [userId, limit]
  );
  
  return result.rows.map(row => ({
    id: row.id,
    placeId: row.placeid,
    placeName: row.placename,
    rating: row.rating,
    comment: row.comment,
    createdAt: new Date(row.createdat),
  }));
}

/**
 * Get user favorites with details
 */
export async function getUserFavorites(userId: string, limit = 10): Promise<Array<{
  id: string;
  placeId: string;
  placeName: string;
  placeImage?: string;
  createdAt: Date;
}>> {
  const result = await query(
    `SELECT 
      uf.id,
      uf.place_id as placeId,
      p.name as placeName,
      p.image as placeImage,
      uf.created_at as createdAt
     FROM user_favorites uf
     JOIN places p ON uf.place_id = p.id
     WHERE uf.user_id = $1
     ORDER BY uf.created_at DESC
     LIMIT $2`,
    [userId, limit]
  );
  
  return result.rows.map(row => ({
    id: row.id,
    placeId: row.placeid,
    placeName: row.placename,
    placeImage: row.placeimage,
    createdAt: new Date(row.createdat),
  }));
}
