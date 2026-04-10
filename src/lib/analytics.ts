/**
 * Analytics Library
 * User behavior and business metrics analytics
 */
import { query, queryOne, queryRows, insert } from './postgres';
import { logger } from './logging';

export async function createSession(sessionId: string, userId?: string, metadata?: any): Promise<void> {
  try {
    await insert('user_sessions', {
      session_id: sessionId,
      user_id: userId,
      ip_address: metadata?.ipAddress,
      user_agent: metadata?.userAgent,
      country: metadata?.country,
      city: metadata?.city,
      device_type: metadata?.deviceType,
      browser: metadata?.browser,
      os: metadata?.os,
      referrer: metadata?.referrer,
      utm_source: metadata?.utm_source,
      utm_medium: metadata?.utm_medium,
      utm_campaign: metadata?.utm_campaign,
    });
  } catch (error) {
    logger.error('Failed to create session', error instanceof Error ? error : new Error(String(error)));
  }
}

export async function recordPageView(sessionId: string, userId: string | undefined, pageUrl: string, metadata?: any): Promise<void> {
  try {
    await insert('page_views', {
      session_id: sessionId,
      user_id: userId,
      page_url: pageUrl,
      page_title: metadata?.title,
      referrer_url: metadata?.referrer,
      time_on_page_seconds: metadata?.timeOnPage,
      scroll_depth: metadata?.scrollDepth,
    });
    await query('UPDATE user_sessions SET page_view_count = page_view_count + 1 WHERE session_id = $1', [sessionId]);
  } catch (error) {
    logger.error('Failed to record page view', error instanceof Error ? error : new Error(String(error)));
  }
}

export async function recordInteraction(sessionId: string, userId: string | undefined, interactionType: string, metadata?: any): Promise<void> {
  try {
    await insert('user_interactions', {
      session_id: sessionId,
      user_id: userId,
      interaction_type: interactionType,
      interaction_target: metadata?.target,
      interaction_data: metadata?.data ? JSON.stringify(metadata.data) : null,
      page_url: metadata?.pageUrl,
    });
    await query('UPDATE user_sessions SET interaction_count = interaction_count + 1 WHERE session_id = $1', [sessionId]);
  } catch (error) {
    logger.error('Failed to record interaction', error instanceof Error ? error : new Error(String(error)));
  }
}

export async function recordSearch(sessionId: string, userId: string | undefined, query: string, filters?: any, resultCount?: number): Promise<void> {
  try {
    await insert('search_analytics', {
      session_id: sessionId,
      user_id: userId,
      search_query: query,
      search_filters: filters ? JSON.stringify(filters) : null,
      result_count: resultCount,
    });
  } catch (error) {
    logger.error('Failed to record search', error instanceof Error ? error : new Error(String(error)));
  }
}

export async function recordPlaceView(placeId: string, userId: string | undefined, metadata?: any): Promise<void> {
  try {
    await insert('place_visitors', {
      place_id: placeId,
      user_id: userId,
      session_id: metadata?.sessionId,
      visit_type: metadata?.visitType,
      device_type: metadata?.deviceType,
      city: metadata?.city,
      country: metadata?.country,
      action_taken: metadata?.actionTaken,
    });
    await query('UPDATE place_daily_metrics SET view_count = view_count + 1 WHERE place_id = $1 AND metric_date = CURRENT_DATE', [placeId]);
  } catch (error) {
    logger.error('Failed to record place view', error instanceof Error ? error : new Error(String(error)));
  }
}

export async function getPlaceAnalytics(placeId: string, startDate: Date, endDate: Date): Promise<any> {
  try {
    const metrics = await queryRows(`
      SELECT * FROM place_daily_metrics
      WHERE place_id = $1 AND metric_date BETWEEN $2 AND $3
      ORDER BY metric_date DESC
    `, [placeId, startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]]);

    const summary = await queryOne(`
      SELECT
        SUM(view_count) as total_views,
        SUM(click_count) as total_clicks,
        SUM(review_count) as total_reviews,
        AVG(review_sentiment_avg) as avg_sentiment,
        SUM(like_count) as total_likes,
        SUM(share_count) as total_shares
      FROM place_daily_metrics
      WHERE place_id = $1 AND metric_date BETWEEN $2 AND $3
    `, [placeId, startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]]);

    return { metrics, summary };
  } catch (error) {
    logger.error('Failed to get place analytics', error instanceof Error ? error : new Error(String(error)));
    return { metrics: [], summary: null };
  }
}

export async function getUserAnalytics(userId: string, startDate: Date, endDate: Date): Promise<any> {
  try {
    const sessions = await queryRows(`
      SELECT COUNT(*) as session_count, AVG(duration_seconds) as avg_session_duration
      FROM user_sessions
      WHERE user_id = $1 AND started_at BETWEEN $2 AND $3
    `, [userId, startDate, endDate]);

    const interactions = await queryRows(`
      SELECT interaction_type, COUNT(*) as count
      FROM user_interactions
      WHERE user_id = $1 AND occurred_at BETWEEN $2 AND $3
      GROUP BY interaction_type
    `, [userId, startDate, endDate]);

    return { sessions: sessions[0] || {}, interactions };
  } catch (error) {
    logger.error('Failed to get user analytics', error instanceof Error ? error : new Error(String(error)));
    return { sessions: {}, interactions: [] };
  }
}

export async function createConversionGoal(userId: string, goalName: string, goalType: string, metadata?: any): Promise<string> {
  try {
    const id = crypto.randomUUID();
    await insert('conversion_goals', {
      id,
      user_id: userId,
      goal_name: goalName,
      goal_type: goalType,
      goal_description: metadata?.description,
      goal_url_pattern: metadata?.urlPattern,
      goal_event_type: metadata?.eventType,
      value_cents: metadata?.valueCents,
    });
    return id;
  } catch (error) {
    logger.error('Failed to create conversion goal', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

export async function recordConversion(goalId: string, metadata?: any): Promise<void> {
  try {
    await insert('conversions', {
      goal_id: goalId,
      session_id: metadata?.sessionId,
      user_id: metadata?.userId,
      conversion_value_cents: metadata?.valueCents,
      conversion_data: metadata?.data ? JSON.stringify(metadata.data) : null,
    });
    await query('UPDATE conversion_goals SET id = id WHERE id = $1', [goalId]);
  } catch (error) {
    logger.error('Failed to record conversion', error instanceof Error ? error : new Error(String(error)));
  }
}

export async function getConversionMetrics(userId: string, startDate: Date, endDate: Date): Promise<any> {
  try {
    const goals = await queryRows(`
      SELECT g.*, COUNT(c.id) as conversion_count, SUM(c.conversion_value_cents) as total_value
      FROM conversion_goals g
      LEFT JOIN conversions c ON g.id = c.goal_id AND c.converted_at BETWEEN $2 AND $3
      WHERE g.user_id = $1
      GROUP BY g.id
    `, [userId, startDate, endDate]);

    return goals;
  } catch (error) {
    logger.error('Failed to get conversion metrics', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

export async function getPlatformStats(days: number): Promise<any> {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const stats = await queryOne(`
      SELECT
        COUNT(DISTINCT s.session_id) as total_sessions,
        COUNT(DISTINCT s.user_id) as unique_users,
        SUM(pv.time_on_page_seconds) as total_time_spent,
        COUNT(DISTINCT pv.page_url) as unique_pages,
        COUNT(DISTINCT sa.search_query) as unique_searches,
        AVG(s.duration_seconds) as avg_session_duration,
        COUNT(DISTINCT c.id) as total_conversions
      FROM user_sessions s
      LEFT JOIN page_views pv ON s.session_id = pv.session_id
      LEFT JOIN search_analytics sa ON s.session_id = sa.session_id
      LEFT JOIN conversions c ON s.session_id = c.session_id
      WHERE s.started_at >= $1
    `, [startDate]);

    return {
      totalSessions: parseInt(stats?.total_sessions || '0'),
      uniqueUsers: parseInt(stats?.unique_users || '0'),
      totalTimeSpent: parseInt(stats?.total_time_spent || '0'),
      uniquePages: parseInt(stats?.unique_pages || '0'),
      uniqueSearches: parseInt(stats?.unique_searches || '0'),
      avgSessionDuration: Math.round(parseFloat(stats?.avg_session_duration || '0')),
      totalConversions: parseInt(stats?.total_conversions || '0'),
      period: days
    };
  } catch (error) {
    logger.error('Failed to get platform stats', error instanceof Error ? error : new Error(String(error)));
    return { totalSessions: 0, uniqueUsers: 0, totalTimeSpent: 0, uniquePages: 0, uniqueSearches: 0, avgSessionDuration: 0, totalConversions: 0, period: days };
  }
}

export async function calculateDailyStats(date: Date = new Date()): Promise<any> {
  const targetDate = new Date(date);
  const dayStart = new Date(targetDate);
  dayStart.setHours(0, 0, 0, 0);

  try {
    const stats = await getPlatformStats(1);
    logger.info('Daily stats calculated', {
      date: dayStart.toISOString().split('T')[0],
      totalSessions: stats.totalSessions,
      uniqueUsers: stats.uniqueUsers,
      totalConversions: stats.totalConversions
    });
    return stats;
  } catch (error) {
    logger.error('Failed to calculate daily stats', error instanceof Error ? error : new Error(String(error)), {
      date: dayStart.toISOString().split('T')[0]
    });
    throw error;
  }
}

export async function getTrendingPlacesByViews(days: number, limit: number): Promise<any[]> {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const places = await queryRows(`
      SELECT
        p.id,
        p.name,
        p.category,
        SUM(pdm.view_count) as total_views,
        SUM(pdm.click_count) as total_clicks,
        SUM(pdm.like_count) as total_likes,
        SUM(pdm.share_count) as total_shares,
        AVG(p.rating) as avg_rating,
        COUNT(DISTINCT r.id) as review_count
      FROM places p
      LEFT JOIN place_daily_metrics pdm ON p.id = pdm.place_id AND pdm.metric_date >= $1
      LEFT JOIN reviews r ON p.id = r.place_id
      GROUP BY p.id, p.name, p.category
      ORDER BY total_views DESC NULLS LAST
      LIMIT $2
    `, [startDate.toISOString().split('T')[0], limit]);

    return places.map((p: any) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      totalViews: parseInt(p.total_views || '0'),
      totalClicks: parseInt(p.total_clicks || '0'),
      totalLikes: parseInt(p.total_likes || '0'),
      totalShares: parseInt(p.total_shares || '0'),
      avgRating: parseFloat(p.avg_rating || '0'),
      reviewCount: parseInt(p.review_count || '0')
    }));
  } catch (error) {
    logger.error('Failed to get trending places', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

export async function getSearchTrends(days: number, limit: number): Promise<any[]> {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const trends = await queryRows(`
      SELECT
        search_query,
        COUNT(*) as search_count,
        AVG(result_count) as avg_results
      FROM search_analytics
      WHERE occurred_at >= $1 AND search_query IS NOT NULL
      GROUP BY search_query
      ORDER BY search_count DESC
      LIMIT $2
    `, [startDate, limit]);

    return trends.map((t: any) => ({
      query: t.search_query,
      count: parseInt(t.search_count || '0'),
      avgResults: Math.round(parseFloat(t.avg_results || '0'))
    }));
  } catch (error) {
    logger.error('Failed to get search trends', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

export async function getUserActivitySummary(userId: string, days: number): Promise<any> {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [views, searches, reviews, comments, favorites] = await Promise.all([
      queryOne(`SELECT COUNT(*) as count FROM page_views WHERE user_id = $1 AND created_at >= $2`, [userId, startDate]),
      queryOne(`SELECT COUNT(*) as count FROM search_analytics WHERE user_id = $1 AND occurred_at >= $2`, [userId, startDate]),
      queryOne(`SELECT COUNT(*) as count FROM reviews WHERE user_id = $1 AND created_at >= $2`, [userId, startDate]),
      queryOne(`SELECT COUNT(*) as count FROM comments WHERE user_id = $1 AND created_at >= $2`, [userId, startDate]),
      queryOne(`SELECT COUNT(*) as count FROM place_likes WHERE user_id = $1 AND created_at >= $2`, [userId, startDate])
    ]);

    const viewCount = parseInt(views?.count || '0');
    const searchCount = parseInt(searches?.count || '0');
    const reviewCount = parseInt(reviews?.count || '0');
    const commentCount = parseInt(comments?.count || '0');
    const favoriteCount = parseInt(favorites?.count || '0');

    return {
      views: viewCount,
      searches: searchCount,
      reviews: reviewCount,
      comments: commentCount,
      favorites: favoriteCount,
      total: viewCount + searchCount + reviewCount + commentCount + favoriteCount,
      period: days
    };
  } catch (error) {
    logger.error('Failed to get user activity summary', error instanceof Error ? error : new Error(String(error)));
    return { views: 0, searches: 0, reviews: 0, comments: 0, favorites: 0, total: 0, period: days };
  }
}
