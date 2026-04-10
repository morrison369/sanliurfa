import { queryOne, queryRows, insert } from './postgres';
import { getCache, setCache, deleteCache } from './cache';
import { logger } from './logging';
import type { PlaceAnalytics, PromotionMetrics, ReviewAnalysis, VisitorStats } from './business-analytics.types';
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

