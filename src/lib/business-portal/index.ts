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
      (SELECT COUNT(*) FROM reviews WHERE place_id = $2 AND status = 'active') as total_reviews,
      (SELECT COALESCE(AVG(rating), 0) FROM reviews WHERE place_id = $2 AND status = 'active') as avg_rating,
      (SELECT COUNT(*) FROM favorites WHERE place_id = $2) as total_favorites,
      (SELECT COUNT(DISTINCT COALESCE(user_id::text, session_id)) FROM page_views WHERE path LIKE $1 AND created_at >= NOW() - INTERVAL '30 days') as monthly_visitors`,
    [`%/place/${placeId}%`, placeId]
  );

  const [recentReviews, topDays, demographics] = await Promise.all([
    query(
      `SELECT r.*, u.full_name as user_name
       FROM reviews r
       LEFT JOIN users u ON r.user_id = u.id
       WHERE r.place_id = $1
       ORDER BY r.created_at DESC
       LIMIT 10`,
      [placeId]
    ),
    query(
      `SELECT TO_CHAR(created_at, 'Day') as day_name,
              EXTRACT(DOW FROM created_at) as day_of_week,
              COUNT(*) as view_count
       FROM page_views
       WHERE path LIKE $1
       AND created_at >= NOW() - INTERVAL '30 days'
       GROUP BY day_name, day_of_week
       ORDER BY view_count DESC`,
      [`%/place/${placeId}%`]
    ),
    query(
      `SELECT device, COUNT(*) as count
       FROM page_views
       WHERE path LIKE $1
       AND created_at >= NOW() - INTERVAL '30 days'
       GROUP BY device`,
      [`%/place/${placeId}%`]
    ),
  ]);

  const customerDemographics: Record<string, number> = {};
  demographics.rows.forEach((r: any) => {
    customerDemographics[r.device || 'unknown'] = parseInt(r.count);
  });

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
    topPerformingDays: topDays.rows.map((r: any) => ({
      day: r.day_name?.trim(),
      views: parseInt(r.view_count),
    })),
    customerDemographics,
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
  const days = period === 'week' ? 7 : period === 'month' ? 30 : 365;

  const [reviews, reviewsPrev, views, viewsPrev] = await Promise.all([
    query(
      `SELECT COUNT(*) as count FROM reviews
       WHERE place_id = $1 AND created_at >= NOW() - ($2 * INTERVAL '1 day')`,
      [placeId, days]
    ),
    query(
      `SELECT COUNT(*) as count FROM reviews
       WHERE place_id = $1
       AND created_at >= NOW() - ($2 * INTERVAL '1 day')
       AND created_at < NOW() - ($3 * INTERVAL '1 day')`,
      [placeId, days * 2, days]
    ),
    query(
      `SELECT COUNT(*) as count FROM page_views
       WHERE path LIKE $1 AND created_at >= NOW() - ($2 * INTERVAL '1 day')`,
      [`%/place/${placeId}%`, days]
    ),
    query(
      `SELECT COUNT(*) as count FROM page_views
       WHERE path LIKE $1
       AND created_at >= NOW() - ($2 * INTERVAL '1 day')
       AND created_at < NOW() - ($3 * INTERVAL '1 day')`,
      [`%/place/${placeId}%`, days * 2, days]
    ),
  ]);

  const reviewCount = parseInt(reviews.rows[0].count);
  const reviewPrevCount = parseInt(reviewsPrev.rows[0].count);
  const reviewDiff = reviewPrevCount > 0
    ? Math.round(((reviewCount - reviewPrevCount) / reviewPrevCount) * 100)
    : 0;

  const viewCount = parseInt(views.rows[0].count);
  const viewPrevCount = parseInt(viewsPrev.rows[0].count);
  const viewDiff = viewPrevCount > 0
    ? Math.round(((viewCount - viewPrevCount) / viewPrevCount) * 100)
    : 0;

  return [
    {
      type: 'review',
      count: reviewCount,
      trend: reviewDiff > 0 ? 'up' : reviewDiff < 0 ? 'down' : 'stable',
      percentage: Math.abs(reviewDiff)
    },
    {
      type: 'view',
      count: viewCount,
      trend: viewDiff > 0 ? 'up' : viewDiff < 0 ? 'down' : 'stable',
      percentage: Math.abs(viewDiff)
    }
  ];
}
