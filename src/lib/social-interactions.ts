/**
 * Social Interactions
 * Likes, reactions, shares, and engagement tracking
 */
import { query, queryOne, queryMany, insert } from './postgres';
import { logger } from './logging';
import { deleteCache, deleteCachePattern } from './cache';

export async function likePlace(placeId: string, userId: string): Promise<boolean> {
  try {
    await insert('place_likes', { place_id: placeId, user_id: userId, created_at: new Date() });
    await deleteCachePattern(`sanliurfa:place:${placeId}:*`);
    logger.info('Place liked', { placeId, userId });
    return true;
  } catch (error) {
    return false;
  }
}

export async function unlikePlace(placeId: string, userId: string): Promise<boolean> {
  try {
    await query('DELETE FROM place_likes WHERE place_id = $1 AND user_id = $2', [placeId, userId]);
    await deleteCachePattern(`sanliurfa:place:${placeId}:*`);
    return true;
  } catch (error) {
    return false;
  }
}

export async function hasUserLikedPlace(placeId: string, userId: string): Promise<boolean> {
  try {
    const result = await queryOne('SELECT id FROM place_likes WHERE place_id = $1 AND user_id = $2', [placeId, userId]);
    return !!result;
  } catch (error) {
    return false;
  }
}

export async function getPlaceLikeCount(placeId: string): Promise<number> {
  try {
    const result = await queryOne('SELECT COUNT(*) as count FROM place_likes WHERE place_id = $1', [placeId]);
    return parseInt(result?.count || '0', 10);
  } catch (error) {
    return 0;
  }
}

export async function addReaction(reviewId: string, userId: string, reactionType: string): Promise<boolean> {
  try {
    const validTypes = ['like', 'helpful', 'funny', 'insightful', 'love'];
    if (!validTypes.includes(reactionType)) return false;
    await insert('review_reactions', { review_id: reviewId, user_id: userId, reaction_type: reactionType });
    await deleteCachePattern(`sanliurfa:review:${reviewId}:*`);
    logger.info('Reaction added', { reviewId, userId, reactionType });
    return true;
  } catch (error) {
    return false;
  }
}

export async function removeReaction(reviewId: string, userId: string, reactionType: string): Promise<boolean> {
  try {
    await query('DELETE FROM review_reactions WHERE review_id = $1 AND user_id = $2 AND reaction_type = $3', [reviewId, userId, reactionType]);
    await deleteCachePattern(`sanliurfa:review:${reviewId}:*`);
    return true;
  } catch (error) {
    return false;
  }
}

export async function getReactionCounts(reviewId: string): Promise<Record<string, number>> {
  try {
    const results = await queryMany('SELECT reaction_type, COUNT(*) as count FROM review_reactions WHERE review_id = $1 GROUP BY reaction_type', [reviewId]);
    const counts: Record<string, number> = {};
    results.forEach((r: any) => {
      counts[r.reaction_type] = parseInt(r.count, 10);
    });
    return counts;
  } catch (error) {
    return {};
  }
}

export async function sharePlace(placeId: string, userId: string, platform?: string, shareUrl?: string): Promise<string> {
  try {
    const id = crypto.randomUUID();
    await insert('shares', { id, shared_by_user_id: userId, place_id: placeId, share_platform: platform, share_url: shareUrl });
    logger.info('Place shared', { placeId, userId, platform });
    return id;
  } catch (error) {
    throw error;
  }
}

export async function shareReview(reviewId: string, userId: string, platform?: string, shareUrl?: string): Promise<string> {
  try {
    const id = crypto.randomUUID();
    await insert('shares', { id, shared_by_user_id: userId, review_id: reviewId, share_platform: platform, share_url: shareUrl });
    logger.info('Review shared', { reviewId, userId, platform });
    return id;
  } catch (error) {
    throw error;
  }
}

export async function getShareCount(placeId?: string, reviewId?: string): Promise<number> {
  try {
    let sql = 'SELECT COUNT(*) as count FROM shares WHERE';
    let params: any[] = [];
    if (placeId) {
      sql += ' place_id = $1';
      params = [placeId];
    } else if (reviewId) {
      sql += ' review_id = $1';
      params = [reviewId];
    }
    const result = await queryOne(sql, params);
    return parseInt(result?.count || '0', 10);
  } catch (error) {
    return 0;
  }
}

export async function recordEngagementEvent(userId: string, eventType: string, placeId?: string, sessionId?: string, data?: any): Promise<void> {
  try {
    await insert('engagement_events', {
      user_id: userId,
      place_id: placeId,
      event_type: eventType,
      session_id: sessionId,
      event_data: data ? JSON.stringify(data) : null,
    });
  } catch (error) {
    logger.error('Failed to record engagement event', error instanceof Error ? error : new Error(String(error)));
  }
}

export async function getTrendingPlaces(limit: number = 10, category?: string): Promise<any[]> {
  try {
    let whereClause = 'WHERE trend_date = CURRENT_DATE';
    let params: any[] = [];
    if (category) {
      whereClause += ' AND trend_category = $1';
      params = [category];
    }
    const trending = await queryMany(`
      SELECT t.*, p.name, p.category, p.rating, p.review_count
      FROM trending_places t
      JOIN places p ON t.place_id = p.id
      ${whereClause}
      ORDER BY t.engagement_score DESC
      LIMIT $${params.length + 1}
    `, [...params, limit]);
    return trending;
  } catch (error) {
    logger.error('Failed to get trending places', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

export async function recordUserPreferences(userId: string, categories?: string[], locations?: any[], priceRange?: string, distanceRadius?: number): Promise<void> {
  try {
    const existing = await queryOne('SELECT id FROM user_preferences WHERE user_id = $1', [userId]);
    if (existing) {
      await query(
        'UPDATE user_preferences SET preferred_categories = $1, preferred_locations = $2, price_range = $3, distance_radius_km = $4, last_updated = NOW() WHERE user_id = $5',
        [JSON.stringify(categories || []), JSON.stringify(locations || []), priceRange, distanceRadius || 10, userId]
      );
    } else {
      await insert('user_preferences', {
        user_id: userId,
        preferred_categories: JSON.stringify(categories || []),
        preferred_locations: JSON.stringify(locations || []),
        price_range: priceRange,
        distance_radius_km: distanceRadius || 10,
      });
    }
  } catch (error) {
    logger.error('Failed to record user preferences', error instanceof Error ? error : new Error(String(error)));
  }
}

export async function getUserPreferences(userId: string): Promise<any> {
  try {
    return await queryOne('SELECT * FROM user_preferences WHERE user_id = $1', [userId]);
  } catch (error) {
    return null;
  }
}
