// Analytics tracking - PostgreSQL
import { query } from './postgres';

interface AnalyticsEvent {
  event_type: string;
  user_id?: string;
  session_id?: string;
  page_url?: string;
  metadata?: Record<string, any>;
}

// Track page view
export async function trackPageView(pageUrl: string, userId?: string) {
  try {
    await query(
      `INSERT INTO analytics_events (event_type, user_id, page_url, created_at) 
       VALUES ($1, $2, $3, NOW())`,
      ['page_view', userId || null, pageUrl]
    );
  } catch (error) {
    console.error('Analytics error:', error);
  }
}

// Track event
export async function trackEvent(eventType: string, metadata?: Record<string, any>, userId?: string) {
  try {
    await query(
      `INSERT INTO analytics_events (event_type, user_id, metadata, created_at) 
       VALUES ($1, $2, $3, NOW())`,
      [eventType, userId || null, JSON.stringify(metadata || {})]
    );
  } catch (error) {
    console.error('Analytics error:', error);
  }
}

// Track search
export async function trackSearch(searchQuery: string, resultsCount: number, userId?: string) {
  await trackEvent('search', { query: searchQuery, results_count: resultsCount }, userId);
}

// Track place view
export async function trackPlaceView(placeId: string, placeName: string, userId?: string) {
  await trackEvent('place_view', { place_id: placeId, place_name: placeName }, userId);
}

// Track reservation
export async function trackReservation(reservationId: string, placeId: string, amount: number, userId?: string) {
  await trackEvent('reservation_created', { 
    reservation_id: reservationId, 
    place_id: placeId,
    amount 
  }, userId);
}

// Get analytics summary (admin only)
export async function getAnalyticsSummary(startDate: string, endDate: string) {
  const result = await query(
    `SELECT 
      event_type,
      COUNT(*) as count,
      COUNT(DISTINCT user_id) as unique_users
     FROM analytics_events 
     WHERE created_at BETWEEN $1 AND $2
     GROUP BY event_type`,
    [startDate, endDate]
  );
  
  return result.rows;
}
