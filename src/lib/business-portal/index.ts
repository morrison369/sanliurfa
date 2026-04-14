/**
 * Business Owner Portal
 * Place management, analytics, and customer insights for business owners
 */

import { query } from '../postgres';

export interface BusinessDashboard {
  placeId: string;
  placeName: string;
  stats: {
    totalViews: number;
    totalReviews: number;
    averageRating: number;
    totalFavorites: number;
    monthlyVisitors: number;
  };
  recentReviews: any[];
  topPerformingDays: any[];
  customerDemographics: any;
}

export interface BusinessInsight {
  type: 'review' | 'view' | 'favorite' | 'search';
  count: number;
  trend: 'up' | 'down' | 'stable';
  percentage: number;
}

/**
 * Get business dashboard data
 */
export async function getBusinessDashboard(
  placeId: string,
  ownerId: string
): Promise<BusinessDashboard | null> {
  // Verify ownership
  const ownership = await query(
    `SELECT 1 FROM places WHERE id = $1 AND owner_id = $2`,
    [placeId, ownerId]
  );

  if (ownership.rows.length === 0) {
    return null;
  }

  // Get place info
  const place = await query(
    `SELECT id, name FROM places WHERE id = $1`,
    [placeId]
  );

  // Get stats
  const stats = await query(
    `SELECT 
      (SELECT COUNT(*) FROM page_views WHERE path LIKE $1) as total_views,
      (SELECT COUNT(*) FROM reviews WHERE place_id = $2 AND status = 'approved') as total_reviews,
      (SELECT COALESCE(AVG(rating), 0) FROM reviews WHERE place_id = $2 AND status = 'approved') as avg_rating,
      (SELECT COUNT(*) FROM favorites WHERE place_id = $2) as total_favorites,
      (SELECT COUNT(DISTINCT visitor_id) FROM page_views WHERE path LIKE $1 AND created_at >= NOW() - INTERVAL '30 days') as monthly_visitors`,
    [`%/place/${placeId}%`, placeId]
  );

  // Get recent reviews
  const recentReviews = await query(
    `SELECT r.*, u.name as user_name
     FROM reviews r
     LEFT JOIN users u ON r.user_id = u.id
     WHERE r.place_id = $1
     ORDER BY r.created_at DESC
     LIMIT 10`,
    [placeId]
  );

  return {
    placeId,
    placeName: place.rows[0].name,
    stats: {
      totalViews: parseInt(stats.rows[0].total_views),
      totalReviews: parseInt(stats.rows[0].total_reviews),
      averageRating: parseFloat(stats.rows[0].avg_rating),
      totalFavorites: parseInt(stats.rows[0].total_favorites),
      monthlyVisitors: parseInt(stats.rows[0].monthly_visitors)
    },
    recentReviews: recentReviews.rows,
    topPerformingDays: [],
    customerDemographics: {}
  };
}

/**
 * Update business info
 */
export async function updateBusinessInfo(
  placeId: string,
  ownerId: string,
  updates: {
    name?: string;
    description?: string;
    phone?: string;
    website?: string;
    openingHours?: any;
    photos?: string[];
  }
): Promise<boolean> {
  const fields: string[] = [];
  const values: any[] = [];

  if (updates.name) {
    fields.push('name = $' + (values.length + 1));
    values.push(updates.name);
  }
  if (updates.description) {
    fields.push('description = $' + (values.length + 1));
    values.push(updates.description);
  }
  if (updates.phone) {
    fields.push('phone = $' + (values.length + 1));
    values.push(updates.phone);
  }
  if (updates.website) {
    fields.push('website = $' + (values.length + 1));
    values.push(updates.website);
  }
  if (updates.openingHours) {
    fields.push('opening_hours = $' + (values.length + 1));
    values.push(JSON.stringify(updates.openingHours));
  }
  if (updates.photos) {
    fields.push('images = $' + (values.length + 1));
    values.push(updates.photos);
  }

  if (fields.length === 0) return false;

  values.push(placeId, ownerId);

  const result = await query(
    `UPDATE places SET ${fields.join(', ')}, updated_at = NOW()
     WHERE id = $${values.length - 1} AND owner_id = $${values.length}
     RETURNING id`,
    values
  );

  return result.rowCount > 0;
}

/**
 * Respond to review
 */
export async function respondToReview(
  reviewId: string,
  placeId: string,
  ownerId: string,
  response: string
): Promise<boolean> {
  // Verify ownership
  const ownership = await query(
    `SELECT 1 FROM places WHERE id = $1 AND owner_id = $2`,
    [placeId, ownerId]
  );

  if (ownership.rows.length === 0) {
    return false;
  }

  await query(
    `UPDATE reviews SET owner_response = $1, owner_responded_at = NOW()
     WHERE id = $2 AND place_id = $3`,
    [response, reviewId, placeId]
  );

  return true;
}

/**
 * Get business insights
 */
export async function getBusinessInsights(
  placeId: string,
  period: 'week' | 'month' | 'year' = 'month'
): Promise<BusinessInsight[]> {
  const interval = period === 'week' ? '7 days' : period === 'month' ? '30 days' : '1 year';

  const [reviews, views] = await Promise.all([
    query(
      `SELECT COUNT(*) as count FROM reviews 
       WHERE place_id = $1 AND created_at >= NOW() - INTERVAL '${interval}'`,
      [placeId]
    ),
    query(
      `SELECT COUNT(*) as count FROM page_views 
       WHERE path LIKE $1 AND created_at >= NOW() - INTERVAL '${interval}'`,
      [`%/place/${placeId}%`]
    )
  ]);

  return [
    {
      type: 'review',
      count: parseInt(reviews.rows[0].count),
      trend: 'up',
      percentage: 15
    },
    {
      type: 'view',
      count: parseInt(views.rows[0].count),
      trend: 'up',
      percentage: 23
    }
  ];
}
