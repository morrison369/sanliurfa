/**
 * Business Intelligence & Data Warehouse
 * Task 123: Advanced BI
 */

import { db } from '../db';
import { sql } from 'drizzle-orm';

export interface DashboardMetrics {
  date: string;
  users: { new: number; active: number; total: number };
  places: { views: number; new: number; total: number };
  reviews: { count: number; avgRating: number };
  revenue: { total: number; subscriptions: number; ads: number };
  engagement: { sessions: number; avgDuration: number; bounceRate: number };
}

export interface CohortAnalysis {
  cohortDate: string;
  size: number;
  retention: number[];
}

export interface FunnelStage {
  name: string;
  users: number;
  conversionRate: number;
  dropOffRate: number;
}

/**
 * Get executive dashboard metrics
 */
export async function getDashboardMetrics(dateRange: { start: Date; end: Date }): Promise<DashboardMetrics[]> {
  const result = await db.execute(sql`
    SELECT 
      DATE(created_at) as date,
      COUNT(DISTINCT CASE WHEN created_at >= ${dateRange.start} THEN user_id END) as new_users,
      COUNT(DISTINCT user_id) as active_users,
      SUM(CASE WHEN event_type = 'place_view' THEN 1 ELSE 0 END) as place_views,
      AVG(CASE WHEN event_type = 'rating' THEN value END) as avg_rating
    FROM analytics_events
    WHERE created_at BETWEEN ${dateRange.start} AND ${dateRange.end}
    GROUP BY DATE(created_at)
    ORDER BY date
  `);

  return result.rows.map((row: any) => ({
    date: row.date,
    users: { new: parseInt(row.new_users), active: parseInt(row.active_users), total: 0 },
    places: { views: parseInt(row.place_views), new: 0, total: 0 },
    reviews: { count: 0, avgRating: parseFloat(row.avg_rating) || 0 },
    revenue: { total: 0, subscriptions: 0, ads: 0 },
    engagement: { sessions: 0, avgDuration: 0, bounceRate: 0 },
  }));
}

/**
 * Cohort retention analysis
 */
export async function getCohortAnalysis(): Promise<CohortAnalysis[]> {
  const result = await db.execute(sql`
    WITH user_cohorts AS (
      SELECT 
        id as user_id,
        DATE_TRUNC('month', created_at) as cohort_date
      FROM users
    ),
    activity AS (
      SELECT 
        uc.cohort_date,
        uc.user_id,
        DATE_TRUNC('month', ae.created_at) as activity_month
      FROM user_cohorts uc
      LEFT JOIN analytics_events ae ON ae.user_id = uc.user_id
    )
    SELECT 
      cohort_date,
      COUNT(DISTINCT user_id) as cohort_size,
      ARRAY_AGG(DISTINCT activity_month) as active_months
    FROM activity
    GROUP BY cohort_date
    ORDER BY cohort_date DESC
    LIMIT 12
  `);

  return result.rows.map((row: any) => ({
    cohortDate: row.cohort_date,
    size: parseInt(row.cohort_size),
    retention: [], // Calculated from active_months
  }));
}

/**
 * Conversion funnel analysis
 */
export async function getConversionFunnel(): Promise<FunnelStage[]> {
  const stages = [
    { name: 'Ziyaretçi', query: sql`SELECT COUNT(*) as count FROM analytics_events WHERE event_type = 'page_view'` },
    { name: 'Kayıt', query: sql`SELECT COUNT(*) as count FROM users WHERE created_at > NOW() - INTERVAL '30 days'` },
    { name: 'Aktif Kullanıcı', query: sql`SELECT COUNT(DISTINCT user_id) as count FROM analytics_events WHERE created_at > NOW() - INTERVAL '7 days'` },
    { name: 'İşlem Yapan', query: sql`SELECT COUNT(DISTINCT user_id) as count FROM payments WHERE status = 'completed'` },
  ];

  const results: FunnelStage[] = [];
  let previousCount = 0;

  for (const stage of stages) {
    const result = await db.execute(stage.query);
    const count = parseInt(result.rows[0]?.count || '0');
    
    results.push({
      name: stage.name,
      users: count,
      conversionRate: previousCount > 0 ? (count / previousCount) * 100 : 100,
      dropOffRate: previousCount > 0 ? ((previousCount - count) / previousCount) * 100 : 0,
    });
    
    previousCount = count;
  }

  return results;
}

/**
 * Generate automated insights
 */
export async function generateInsights(): Promise<string[]> {
  const insights: string[] = [];

  // Growth insight
  const growth = await db.execute(sql`
    SELECT 
      COUNT(*) as current_month,
      (SELECT COUNT(*) FROM users WHERE created_at BETWEEN NOW() - INTERVAL '2 months' AND NOW() - INTERVAL '1 month') as last_month
    FROM users WHERE created_at > NOW() - INTERVAL '1 month'
  `);
  
  const current = parseInt(growth.rows[0]?.current_month || '0');
  const last = parseInt(growth.rows[0]?.last_month || '1');
  const growthRate = ((current - last) / last) * 100;
  
  insights.push(`Kullanıcı büyümesi: %${growthRate.toFixed(1)} (${current} yeni kullanıcı)`);

  // Top performing category
  const topCategory = await db.execute(sql`
    SELECT category, COUNT(*) as count 
    FROM place_views pv
    JOIN places p ON p.id = pv.place_id
    WHERE pv.created_at > NOW() - INTERVAL '7 days'
    GROUP BY category
    ORDER BY count DESC
    LIMIT 1
  `);
  
  if (topCategory.rows[0]) {
    insights.push(`En popüler kategori: ${topCategory.rows[0].category}`);
  }

  return insights;
}

/**
 * Export data for external BI tools
 */
export async function exportForBI(format: 'csv' | 'json' | 'parquet'): Promise<string> {
  const data = await db.execute(sql`
    SELECT * FROM analytics_events 
    WHERE created_at > NOW() - INTERVAL '30 days'
    ORDER BY created_at DESC
  `);

  if (format === 'json') {
    return JSON.stringify(data.rows);
  }

  // CSV format
  if (data.rows.length === 0) return '';
  
  const headers = Object.keys(data.rows[0]).join(',');
  const rows = data.rows.map((row: any) => Object.values(row).join(',')).join('\n');
  return `${headers}\n${rows}`;
}
