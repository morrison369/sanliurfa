/**
 * Recommendations Engine
 * Personalized place and content recommendations
 */
import { queryOne, queryRows, insert, update } from './postgres';
import { logger } from './logging';
import { getTrendingPlaces as getTrendingPlacesFromSocial } from './social-interactions';

export const getTrendingPlaces = getTrendingPlacesFromSocial;
export const getPersonalizedRecommendations = getRecommendationsForUser;

export async function getRecommendationsForUser(userId: string, limit: number = 10): Promise<any[]> {
  try {
    const recs = await queryRows(`
      SELECT ur.*, p.name, p.category, p.rating, p.review_count
      FROM user_recommendations ur
      JOIN places p ON ur.recommended_place_id = p.id
      WHERE ur.user_id = $1 AND ur.clicked = false
      ORDER BY ur.recommendation_score DESC
      LIMIT $2
    `, [userId, limit]);
    return recs;
  } catch (error) {
    logger.error('Failed to get recommendations', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

export async function recordRecommendationClick(recommendationId: string): Promise<void> {
  try {
    await update('user_recommendations', { id: recommendationId }, {
      clicked: true,
      clicked_at: new Date(),
    });
  } catch (error) {
    logger.error('Failed to record recommendation click', error instanceof Error ? error : new Error(String(error)));
  }
}

export async function generateRecommendations(userId: string): Promise<void> {
  try {
    // Get user preferences
    const prefs = await queryOne('SELECT * FROM user_preferences WHERE user_id = $1', [userId]);
    if (!prefs) return;

    const categories = prefs.preferred_categories ? JSON.parse(prefs.preferred_categories) : [];
    const priceRange = prefs.price_range;
    const radius = prefs.distance_radius_km || 10;

    // Get user's liked places (collaborative filtering basis)
    const likedPlaces = await queryRows(
      'SELECT place_id FROM place_likes WHERE user_id = $1 LIMIT 5',
      [userId]
    );

    const likedPlaceIds = likedPlaces.map((p: any) => p.place_id);

    // Find similar places based on multiple factors
    let whereClause = '1=1';
    let params: any[] = [userId];

    if (categories.length > 0) {
      whereClause += ' AND category = ANY($' + (params.length + 1) + ')';
      params.push(categories);
    }

    if (priceRange && priceRange !== 'all') {
      whereClause += ' AND price_range = $' + (params.length + 1);
      params.push(priceRange);
    }

    whereClause += ' AND id NOT IN (SELECT place_id FROM place_likes WHERE user_id = $' + (params.length + 1) + ')';
    params.push(userId);

    const recommendations = await queryRows(`
      SELECT
        id,
        (rating * 0.3 + (review_count::float / 100) * 0.3 + RANDOM() * 0.4) as score
      FROM places
      WHERE ${whereClause}
      ORDER BY score DESC
      LIMIT 15
    `, params);

    // Insert recommendations
    for (const rec of recommendations) {
      try {
        await insert('user_recommendations', {
          user_id: userId,
          recommended_place_id: rec.id,
          recommendation_score: Math.min(1, rec.score),
          reason: 'personalized',
        });
      } catch {
        // Ignore if already exists
      }
    }

    logger.info('Recommendations generated', { userId, count: recommendations.length });
  } catch (error) {
    logger.error('Failed to generate recommendations', error instanceof Error ? error : new Error(String(error)));
  }
}

export async function updateTrendingPlaces(): Promise<void> {
  try {
    // Calculate trending score for each place
    const places = await queryRows(`
      SELECT
        p.id,
        COUNT(DISTINCT pl.id) as like_count,
        COUNT(DISTINCT r.id) as review_count,
        COUNT(DISTINCT s.id) as share_count,
        COUNT(DISTINCT ev.id) as view_count,
        p.category
      FROM places p
      LEFT JOIN place_likes pl ON p.id = pl.place_id AND pl.created_at >= CURRENT_DATE - INTERVAL '7 days'
      LEFT JOIN reviews r ON p.id = r.place_id AND r.created_at >= CURRENT_DATE - INTERVAL '7 days'
      LEFT JOIN shares s ON p.id = s.place_id AND s.created_at >= CURRENT_DATE - INTERVAL '7 days'
      LEFT JOIN engagement_events ev ON p.id = ev.place_id AND ev.event_type = 'view' AND ev.created_at >= CURRENT_DATE - INTERVAL '7 days'
      GROUP BY p.id, p.category
    `, []);

    for (const place of places) {
      const engagementScore = (place.like_count * 2 + place.review_count * 1.5 + place.share_count * 3 + place.view_count * 0.5);
      try {
        await insert('trending_places', {
          place_id: place.id,
          trend_date: new Date(),
          like_count: place.like_count,
          review_count: place.review_count,
          share_count: place.share_count,
          view_count: place.view_count,
          engagement_score: engagementScore,
          trend_category: place.category,
        });
      } catch {
        // Already exists for today
      }
    }

    logger.info('Trending places updated', { count: places.length });
  } catch (error) {
    logger.error('Failed to update trending places', error instanceof Error ? error : new Error(String(error)));
  }
}

export async function getSimilarPlaces(placeId: string, limit: number = 5): Promise<any[]> {
  try {
    const place = await queryOne('SELECT category, price_range FROM places WHERE id = $1', [placeId]);
    if (!place) return [];

    const similar = await queryRows(`
      SELECT id, name, category, price_range, rating, review_count
      FROM places
      WHERE id != $1 AND category = $2 AND (price_range = $3 OR price_range IS NULL)
      ORDER BY rating DESC
      LIMIT $4
    `, [placeId, place.category, place.price_range, limit]);

    return similar;
  } catch (error) {
    logger.error('Failed to get similar places', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}
