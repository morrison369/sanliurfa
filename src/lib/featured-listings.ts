/**
 * Featured Listings Management
 * Premium featured listing system with analytics and scheduling
 */

import { query, queryOne, queryRows, insert, update } from './postgres';
import { getCache, setCache, deleteCache, deleteCachePattern } from './cache';
import { logger } from './logging';

export interface FeaturedListing {
  id: string;
  place_id: string;
  user_id: string;
  title: string;
  description?: string;
  featured_image_url?: string;
  position_tier: string;
  start_date: string;
  end_date: string;
  status: string;
  views_count: number;
  clicks_count: number;
  conversions_count: number;
  cost_per_day: number;
  total_cost: number;
  payment_status: string;
  settings?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface FeaturedListingMetrics {
  date: string;
  views: number;
  clicks: number;
  conversions: number;
  impressions: number;
  ctr: number;
  conversion_rate: number;
  revenue_generated: number;
}

/**
 * Create a new featured listing
 */
export async function createFeaturedListing(
  placeId: string,
  userId: string,
  data: {
    title: string;
    description?: string;
    featured_image_url?: string;
    position_tier: string;
    start_date: string;
    end_date: string;
    cost_per_day: number;
    settings?: Record<string, any>;
  }
): Promise<FeaturedListing> {
  try {
    // Calculate total cost
    const startDate = new Date(data.start_date);
    const endDate = new Date(data.end_date);
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const totalCost = days * data.cost_per_day;

    const featured = await insert('featured_listings', {
      place_id: placeId,
      user_id: userId,
      title: data.title,
      description: data.description,
      featured_image_url: data.featured_image_url,
      position_tier: data.position_tier,
      start_date: data.start_date,
      end_date: data.end_date,
      status: 'scheduled',
      cost_per_day: data.cost_per_day,
      total_cost: totalCost,
      payment_status: 'pending',
      settings: data.settings || {}
    });

    // Clear place cache
    await deleteCachePattern(`sanliurfa:place:${placeId}:*`);
    await deleteCachePattern(`sanliurfa:featured:*`);

    logger.info('Featured listing created', { id: featured.id, placeId, userId });
    return featured;
  } catch (error) {
    logger.error('Failed to create featured listing', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Get featured listing by ID
 */
export async function getFeaturedListing(id: string): Promise<FeaturedListing | null> {
  try {
    const cacheKey = `sanliurfa:featured:${id}`;
    const cached = await getCache<FeaturedListing>(cacheKey);
    if (cached) return cached;

    const listing = await queryOne('SELECT * FROM featured_listings WHERE id = $1', [id]);
    if (listing) {
      await setCache(cacheKey, listing, 300);
    }
    return listing;
  } catch (error) {
    logger.error('Failed to get featured listing', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Get active featured listings for public display
 */
export async function getActiveFeaturedListings(limit: number = 10, offset: number = 0): Promise<{
  listings: (FeaturedListing & { place_name: string; place_slug: string })[];
  total: number;
}> {
  const cacheKey = `sanliurfa:featured:active:${limit}:${offset}`;

  try {
    const cached = await getCache<any>(cacheKey);
    if (cached) return cached;

    const now = new Date().toISOString();
    const result = await queryRows(
      `SELECT
        fl.*,
        p.name as place_name,
        p.slug as place_slug
       FROM featured_listings fl
       JOIN places p ON p.id = fl.place_id
       WHERE fl.status = 'active'
         AND fl.start_date <= $1
         AND fl.end_date >= $1
       ORDER BY fl.position_tier DESC, fl.created_at DESC
       LIMIT $2 OFFSET $3`,
      [now, limit, offset]
    );

    const countResult = await queryOne(
      `SELECT COUNT(*) as total FROM featured_listings
       WHERE status = 'active'
         AND start_date <= $1
         AND end_date >= $1`,
      [now]
    );

    const data = {
      listings: result,
      total: parseInt(countResult?.total || '0')
    };

    await setCache(cacheKey, data, 300);
    return data;
  } catch (error) {
    logger.error('Failed to get active featured listings', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Get featured listings for a place owner
 */
export async function getUserFeaturedListings(userId: string): Promise<FeaturedListing[]> {
  const cacheKey = `sanliurfa:featured:user:${userId}`;

  try {
    const cached = await getCache<FeaturedListing[]>(cacheKey);
    if (cached) return cached;

    const listings = await queryRows(
      `SELECT * FROM featured_listings
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );

    await setCache(cacheKey, listings, 300);
    return listings;
  } catch (error) {
    logger.error('Failed to get user featured listings', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Update featured listing
 */
export async function updateFeaturedListing(
  id: string,
  userId: string,
  updates: Partial<FeaturedListing>
): Promise<FeaturedListing> {
  try {
    // Verify ownership
    const listing = await queryOne('SELECT user_id FROM featured_listings WHERE id = $1', [id]);
    if (!listing || listing.user_id !== userId) {
      throw new Error('Access denied');
    }

    const updated = await update('featured_listings', { id }, { ...updates, updated_at: new Date() });

    // Clear caches
    await deleteCache(`sanliurfa:featured:${id}`);
    await deleteCachePattern(`sanliurfa:featured:user:${userId}`);
    await deleteCachePattern(`sanliurfa:featured:active:*`);

    logger.info('Featured listing updated', { id, userId });
    return updated;
  } catch (error) {
    logger.error('Failed to update featured listing', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Record a click on a featured listing
 */
export async function recordFeaturedListingClick(
  featuredListingId: string,
  userId: string | null,
  source: string,
  deviceType: string
): Promise<void> {
  try {
    await insert('featured_listing_clicks', {
      featured_listing_id: featuredListingId,
      user_id: userId,
      source,
      device_type: deviceType
    });

    // Increment click count
    await query(
      'UPDATE featured_listings SET clicks_count = clicks_count + 1 WHERE id = $1',
      [featuredListingId]
    );

    // Clear caches
    await deleteCache(`sanliurfa:featured:${featuredListingId}`);
  } catch (error) {
    logger.error('Failed to record featured listing click', error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Get featured listing analytics
 */
export async function getFeaturedListingAnalytics(
  id: string,
  userId: string,
  days: number = 30
): Promise<{
  summary: {
    total_views: number;
    total_clicks: number;
    total_conversions: number;
    avg_ctr: number;
    conversion_rate: number;
  };
  daily_metrics: FeaturedListingMetrics[];
}> {
  try {
    // Verify ownership
    const listing = await queryOne('SELECT user_id FROM featured_listings WHERE id = $1', [id]);
    if (!listing || listing.user_id !== userId) {
      throw new Error('Access denied');
    }

    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);

    // Get daily metrics
    const metrics = await queryRows(
      `SELECT * FROM featured_listing_metrics
       WHERE featured_listing_id = $1 AND date >= $2
       ORDER BY date DESC`,
      [id, fromDate.toISOString().split('T')[0]]
    );

    // Calculate summary
    const summary = {
      total_views: 0,
      total_clicks: 0,
      total_conversions: 0,
      avg_ctr: 0,
      conversion_rate: 0
    };

    metrics.forEach((m: any) => {
      summary.total_views += m.views || 0;
      summary.total_clicks += m.clicks || 0;
      summary.total_conversions += m.conversions || 0;
    });

    if (summary.total_views > 0) {
      summary.avg_ctr = (summary.total_clicks / summary.total_views) * 100;
    }
    if (summary.total_clicks > 0) {
      summary.conversion_rate = (summary.total_conversions / summary.total_clicks) * 100;
    }

    return {
      summary,
      daily_metrics: metrics
    };
  } catch (error) {
    logger.error('Failed to get featured listing analytics', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Activate scheduled featured listings
 * Call this via scheduled job (cron)
 */
export async function activateScheduledListings(): Promise<number> {
  try {
    const now = new Date().toISOString();
    const result = await query(
      `UPDATE featured_listings
       SET status = 'active'
       WHERE status = 'scheduled'
         AND start_date <= $1
         AND payment_status = 'completed'`,
      [now]
    );

    await deleteCachePattern(`sanliurfa:featured:*`);
    logger.info('Featured listings activated', { count: result.rowCount });
    return result.rowCount;
  } catch (error) {
    logger.error('Failed to activate scheduled listings', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Deactivate expired featured listings
 * Call this via scheduled job (cron)
 */
export async function deactivateExpiredListings(): Promise<number> {
  try {
    const now = new Date().toISOString();
    const result = await query(
      `UPDATE featured_listings
       SET status = 'expired'
       WHERE status = 'active' AND end_date < $1`,
      [now]
    );

    await deleteCachePattern(`sanliurfa:featured:*`);
    logger.info('Featured listings deactivated', { count: result.rowCount });
    return result.rowCount;
  } catch (error) {
    logger.error('Failed to deactivate expired listings', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Delete featured listing
 */
export async function deleteFeaturedListing(id: string, userId: string): Promise<boolean> {
  try {
    // Verify ownership
    const listing = await queryOne('SELECT user_id FROM featured_listings WHERE id = $1', [id]);
    if (!listing || listing.user_id !== userId) {
      throw new Error('Access denied');
    }

    const result = await query('DELETE FROM featured_listings WHERE id = $1', [id]);

    // Clear caches
    await deleteCache(`sanliurfa:featured:${id}`);
    await deleteCachePattern(`sanliurfa:featured:user:${userId}`);
    await deleteCachePattern(`sanliurfa:featured:active:*`);

    logger.info('Featured listing deleted', { id, userId });
    return result.rowCount > 0;
  } catch (error) {
    logger.error('Failed to delete featured listing', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}
