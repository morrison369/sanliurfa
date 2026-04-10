/**
 * Advanced Reporting
 * Handles reporting, analytics exports, and scheduled reports
 */

import { queryRows, queryOne } from './postgres';
import { logger } from './logging';

export interface Report {
  id: string;
  name: string;
  type: 'users' | 'places' | 'reviews' | 'revenue' | 'engagement' | 'custom';
  period: 'daily' | 'weekly' | 'monthly';
  filters?: Record<string, any>;
  generatedAt: string;
  data: any[];
}

/**
 * Generate user analytics report
 */
export async function generateUserReport(period: 'daily' | 'weekly' | 'monthly'): Promise<Report | null> {
  try {
    const data = await queryRows(`
      SELECT
        DATE_TRUNC('${period === 'daily' ? 'day' : period === 'weekly' ? 'week' : 'month'}', created_at) as period,
        COUNT(*) as new_users,
        COUNT(CASE WHEN email_verified THEN 1 END) as verified_users,
        COUNT(CASE WHEN is_vendor THEN 1 END) as vendor_users
      FROM users
      WHERE created_at >= NOW() - INTERVAL '1 ${period === 'daily' ? 'month' : 'year'}'
      GROUP BY DATE_TRUNC('${period === 'daily' ? 'day' : period === 'weekly' ? 'week' : 'month'}', created_at)
      ORDER BY period DESC
    `);

    return {
      id: `user_${Date.now()}`,
      name: 'User Analytics Report',
      type: 'users',
      period,
      generatedAt: new Date().toISOString(),
      data
    };
  } catch (error) {
    logger.error('Generate user report failed', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

/**
 * Generate places analytics report
 */
export async function generatePlacesReport(period: 'daily' | 'weekly' | 'monthly'): Promise<Report | null> {
  try {
    const data = await queryRows(`
      SELECT
        p.id, p.name, p.category_id,
        COUNT(DISTINCT r.id) as review_count,
        AVG(r.rating) as avg_rating,
        COUNT(DISTINCT f.id) as favorite_count,
        COUNT(DISTINCT v.id) as view_count
      FROM places p
      LEFT JOIN reviews r ON p.id = r.place_id
      LEFT JOIN favorites f ON p.id = f.place_id
      LEFT JOIN analytics v ON p.id = v.place_id AND v.action_type = 'view'
      WHERE p.created_at >= NOW() - INTERVAL '1 ${period === 'daily' ? 'month' : 'year'}'
      GROUP BY p.id, p.name, p.category_id
      ORDER BY review_count DESC
      LIMIT 100
    `);

    return {
      id: `places_${Date.now()}`,
      name: 'Places Analytics Report',
      type: 'places',
      period,
      generatedAt: new Date().toISOString(),
      data
    };
  } catch (error) {
    logger.error('Generate places report failed', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

/**
 * Generate reviews analytics report
 */
export async function generateReviewsReport(period: 'daily' | 'weekly' | 'monthly'): Promise<Report | null> {
  try {
    const data = await queryRows(`
      SELECT
        DATE_TRUNC('${period === 'daily' ? 'day' : period === 'weekly' ? 'week' : 'month'}', created_at) as period,
        COUNT(*) as total_reviews,
        AVG(rating) as avg_rating,
        SUM(CASE WHEN rating >= 4 THEN 1 ELSE 0 END) as positive_reviews,
        SUM(CASE WHEN rating <= 2 THEN 1 ELSE 0 END) as negative_reviews
      FROM reviews
      WHERE created_at >= NOW() - INTERVAL '1 ${period === 'daily' ? 'month' : 'year'}'
      GROUP BY DATE_TRUNC('${period === 'daily' ? 'day' : period === 'weekly' ? 'week' : 'month'}', created_at)
      ORDER BY period DESC
    `);

    return {
      id: `reviews_${Date.now()}`,
      name: 'Reviews Analytics Report',
      type: 'reviews',
      period,
      generatedAt: new Date().toISOString(),
      data
    };
  } catch (error) {
    logger.error('Generate reviews report failed', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

/**
 * Generate revenue report (for premium members)
 */
export async function generateRevenueReport(period: 'daily' | 'weekly' | 'monthly'): Promise<Report | null> {
  try {
    const data = await queryRows(`
      SELECT
        DATE_TRUNC('${period === 'daily' ? 'day' : period === 'weekly' ? 'week' : 'month'}', created_at) as period,
        tier,
        COUNT(*) as subscription_count,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_subscriptions,
        ROUND(SUM(CASE WHEN tier = 'premium' THEN 2.99 WHEN tier = 'pro' THEN 5.99 ELSE 0 END)::numeric, 2) as monthly_revenue
      FROM memberships
      WHERE created_at >= NOW() - INTERVAL '1 ${period === 'daily' ? 'month' : 'year'}'
      GROUP BY DATE_TRUNC('${period === 'daily' ? 'day' : period === 'weekly' ? 'week' : 'month'}', created_at), tier
      ORDER BY period DESC
    `);

    return {
      id: `revenue_${Date.now()}`,
      name: 'Revenue Report',
      type: 'revenue',
      period,
      generatedAt: new Date().toISOString(),
      data
    };
  } catch (error) {
    logger.error('Generate revenue report failed', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

/**
 * Generate engagement report
 */
export async function generateEngagementReport(period: 'daily' | 'weekly' | 'monthly'): Promise<Report | null> {
  try {
    const data = await queryRows(`
      SELECT
        DATE_TRUNC('${period === 'daily' ? 'day' : period === 'weekly' ? 'week' : 'month'}', created_at) as period,
        COUNT(DISTINCT action_type) as action_types,
        COUNT(DISTINCT user_id) as unique_users,
        COUNT(*) as total_actions
      FROM analytics
      WHERE created_at >= NOW() - INTERVAL '1 ${period === 'daily' ? 'month' : 'year'}'
      GROUP BY DATE_TRUNC('${period === 'daily' ? 'day' : period === 'weekly' ? 'week' : 'month'}', created_at)
      ORDER BY period DESC
    `);

    return {
      id: `engagement_${Date.now()}`,
      name: 'Engagement Report',
      type: 'engagement',
      period,
      generatedAt: new Date().toISOString(),
      data
    };
  } catch (error) {
    logger.error('Generate engagement report failed', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

/**
 * Convert report to CSV
 */
export function reportToCSV(report: Report): string {
  if (report.data.length === 0) {
    return '';
  }

  // Get column names from first row
  const columns = Object.keys(report.data[0]);
  const header = columns.join(',');

  // Convert rows
  const rows = report.data.map(row => {
    return columns.map(col => {
      const value = row[col];

      // Handle special cases
      if (value === null || value === undefined) {
        return '';
      }
      if (typeof value === 'string' && value.includes(',')) {
        return `"${value}"`;
      }
      return value;
    }).join(',');
  });

  return [header, ...rows].join('\n');
}

/**
 * Convert report to JSON
 */
export function reportToJSON(report: Report): string {
  return JSON.stringify(report, null, 2);
}

/**
 * Get summary statistics from report
 */
export function getSummaryStats(report: Report): Record<string, any> {
  const stats: Record<string, any> = {
    reportType: report.type,
    period: report.period,
    generatedAt: report.generatedAt,
    dataPoints: report.data.length
  };

  if (report.data.length === 0) {
    return stats;
  }

  // Calculate summary based on report type
  switch (report.type) {
    case 'reviews':
      stats.totalReviews = report.data.reduce((sum, r) => sum + (r.total_reviews || 0), 0);
      stats.avgRating = report.data.reduce((sum, r) => sum + (r.avg_rating || 0), 0) / report.data.length;
      break;

    case 'revenue':
      stats.totalRevenue = report.data.reduce((sum, r) => sum + (r.monthly_revenue || 0), 0);
      stats.activeSubscriptions = report.data.reduce((sum, r) => sum + (r.active_subscriptions || 0), 0);
      break;

    case 'engagement':
      stats.totalActions = report.data.reduce((sum, r) => sum + (r.total_actions || 0), 0);
      stats.uniqueUsers = report.data.reduce((sum, r) => sum + (r.unique_users || 0), 0);
      break;

    case 'users':
      stats.totalNewUsers = report.data.reduce((sum, r) => sum + (r.new_users || 0), 0);
      stats.verifiedUsers = report.data.reduce((sum, r) => sum + (r.verified_users || 0), 0);
      break;

    case 'places':
      stats.totalPlaces = report.data.length;
      stats.avgRating = report.data.reduce((sum, p) => sum + (p.avg_rating || 0), 0) / report.data.length;
      break;
  }

  return stats;
}
