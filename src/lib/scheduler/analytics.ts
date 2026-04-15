/**
 * Scheduler: Daily Analytics Aggregation
 * Calculates daily platform statistics from DB tables
 */

import { query } from '../postgres';
import { logger } from '../logger';

export interface DailyStats {
  date: string;
  pageViews: number;
  uniqueVisitors: number;
  newUsers: number;
  activeUsers: number;
  reviewsSubmitted: number;
  placesAdded: number;
}

/**
 * Calculate daily stats for the given date (defaults to today)
 */
export async function calculateDailyStats(date?: string): Promise<DailyStats> {
  const targetDate = date || new Date().toISOString().split('T')[0];

  const [usersResult, reviewsResult, placesResult, activeResult] = await Promise.all([
    query(
      `SELECT COUNT(*) as total FROM users
       WHERE DATE(created_at) = $1`,
      [targetDate]
    ),
    query(
      `SELECT COUNT(*) as total FROM reviews
       WHERE DATE(created_at) = $1 AND status != 'deleted'`,
      [targetDate]
    ),
    query(
      `SELECT COUNT(*) as total FROM places
       WHERE DATE(created_at) = $1 AND status != 'deleted'`,
      [targetDate]
    ),
    query(
      `SELECT COUNT(DISTINCT user_id) as total FROM audit_logs
       WHERE DATE(created_at) = $1`,
      [targetDate]
    ),
  ]);

  const stats: DailyStats = {
    date: targetDate,
    pageViews: 0,       // tracked via client_performance_metrics, not aggregated here
    uniqueVisitors: 0,  // same
    newUsers: parseInt(usersResult.rows[0]?.total || '0'),
    activeUsers: parseInt(activeResult.rows[0]?.total || '0'),
    reviewsSubmitted: parseInt(reviewsResult.rows[0]?.total || '0'),
    placesAdded: parseInt(placesResult.rows[0]?.total || '0'),
  };

  logger.debug('Daily stats calculated', { date: targetDate, stats });
  return stats;
}

/**
 * Get stats for a date range
 */
export async function getStatsForRange(startDate: string, endDate: string): Promise<DailyStats[]> {
  const result = await query(
    `SELECT
       d::date as date,
       (SELECT COUNT(*) FROM users WHERE DATE(created_at) = d::date) as new_users,
       (SELECT COUNT(*) FROM reviews WHERE DATE(created_at) = d::date AND status != 'deleted') as reviews,
       (SELECT COUNT(*) FROM places WHERE DATE(created_at) = d::date AND status != 'deleted') as places,
       (SELECT COUNT(DISTINCT user_id) FROM audit_logs WHERE DATE(created_at) = d::date) as active_users
     FROM generate_series($1::date, $2::date, '1 day') AS d
     ORDER BY d`,
    [startDate, endDate]
  );
  return result.rows.map((r: any) => ({
    date: r.date,
    pageViews: 0,
    uniqueVisitors: 0,
    newUsers: parseInt(r.new_users || '0'),
    activeUsers: parseInt(r.active_users || '0'),
    reviewsSubmitted: parseInt(r.reviews || '0'),
    placesAdded: parseInt(r.places || '0'),
  }));
}

/**
 * No-op: stats are computed on-demand from source tables
 */
export async function aggregateHourlyToDaily(_date: string): Promise<boolean> {
  return true;
}

export default { calculateDailyStats, getStatsForRange, aggregateHourlyToDaily };
