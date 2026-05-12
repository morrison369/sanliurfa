/**
 * Recommendation Engine
 * Real PostgreSQL-backed recommendations based on place popularity, ratings, and user history.
 */

import { pool } from '../postgres';
import { logger } from '../logger';

export interface Recommendation {
  placeId: string;
  score: number;
  reason: string;
}

export interface UserBehavior {
  userId: string;
  views: string[];
  likes: string[];
  reviews: string[];
  searches: string[];
  bookings: string[];
}

class RecommendationEngine {
  /**
   * Get personalized recommendations for a user.
   * Returns places the user hasn't visited, ranked by category affinity and popularity.
   */
  async getRecommendationsForUser(userId: string, limit: number = 10): Promise<Recommendation[]> {
    try {
      const [seen, topCategories] = await Promise.all([
        pool.query(
          `SELECT DISTINCT place_id::text FROM reviews WHERE user_id = $1
           UNION
           SELECT DISTINCT place_id::text FROM user_favorites WHERE user_id = $1`,
          [userId]
        ),
        pool.query(
          `SELECT p.category_id, COUNT(*) as cnt
           FROM reviews r
           JOIN places p ON r.place_id = p.id
           WHERE r.user_id = $1
           GROUP BY p.category_id
           ORDER BY cnt DESC
           LIMIT 3`,
          [userId]
        ),
      ]);
      const seenIds: string[] = seen.rows.map((r: any) => r.place_id);
      const catIds: string[] = topCategories.rows.map((r: any) => r.category_id).filter(Boolean);

      // Base query: highly-rated places not yet seen by this user
      let query: string;
      let params: any[];

      if (catIds.length > 0 && seenIds.length > 0) {
        query = `SELECT id::text as place_id,
                   COALESCE(rating, 0) * 0.6 + COALESCE(review_count, 0)::float / 100.0 * 0.4 as score,
                   CASE WHEN category_id = ANY($3::uuid[]) THEN 'İlginizi çekebilir' ELSE 'Popüler' END as reason
                 FROM places
                 WHERE is_active = true
                   AND id != ALL($1::uuid[])
                 ORDER BY (category_id = ANY($3::uuid[])) DESC, score DESC
                 LIMIT $2`;
        params = [seenIds, limit, catIds];
      } else if (seenIds.length > 0) {
        query = `SELECT id::text as place_id,
                   COALESCE(rating, 0) * 0.6 + COALESCE(review_count, 0)::float / 100.0 * 0.4 as score,
                   'Popüler' as reason
                 FROM places
                 WHERE is_active = true AND id != ALL($1::uuid[])
                 ORDER BY score DESC
                 LIMIT $2`;
        params = [seenIds, limit];
      } else {
        query = `SELECT id::text as place_id,
                   COALESCE(rating, 0) * 0.6 + COALESCE(review_count, 0)::float / 100.0 * 0.4 as score,
                   'Popüler' as reason
                 FROM places
                 WHERE is_active = true
                 ORDER BY score DESC
                 LIMIT $1`;
        params = [limit];
      }

      const result = await pool.query(query, params);
      return result.rows.map((r: any) => ({
        placeId: r.place_id,
        score: parseFloat(r.score) || 0,
        reason: r.reason
      }));
    } catch (error) {
      logger.error('getRecommendationsForUser failed', error instanceof Error ? error : new Error(String(error)));
      return [];
    }
  }

  /**
   * Get similar places based on same category and district.
   */
  async getSimilarPlaces(placeId: string, limit: number = 5): Promise<Recommendation[]> {
    try {
      const base = await pool.query(
        `SELECT category_id, district_id FROM places WHERE id = $1`,
        [placeId]
      );
      if (!base.rows[0]) return [];

      const { category_id, district_id } = base.rows[0];

      const result = await pool.query(
        `SELECT id::text as place_id,
           COALESCE(rating, 0) as score,
           CASE WHEN district_id = $3 THEN 'Aynı bölge' ELSE 'Benzer kategori' END as reason
         FROM places
         WHERE id != $1 AND category_id = $2 AND is_active = true
         ORDER BY (district_id = $3) DESC, rating DESC
         LIMIT $4`,
        [placeId, category_id, district_id, limit]
      );

      return result.rows.map((r: any) => ({
        placeId: r.place_id,
        score: parseFloat(r.score) || 0,
        reason: r.reason
      }));
    } catch (error) {
      logger.error('getSimilarPlaces failed', error instanceof Error ? error : new Error(String(error)));
      return [];
    }
  }

  /**
   * Record user interaction for future recommendations.
   */
  async recordInteraction(
    userId: string,
    placeId: string,
    action: 'view' | 'like' | 'review' | 'book',
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      // user_activities canonical (logActivity ile uyumlu); kolon: type (action değil)
      await pool.query(
        `INSERT INTO user_activities (user_id, entity_type, entity_id, type, metadata, created_at)
         VALUES ($1, 'place', $2, $3, $4, NOW())
         ON CONFLICT DO NOTHING`,
        [userId, placeId, action, metadata ? JSON.stringify(metadata) : null]
      );
    } catch (error) {
      logger.error('recordInteraction failed', error instanceof Error ? error : new Error(String(error)));
    }
  }
}

// Singleton
export const recommendationEngine = new RecommendationEngine();

export async function getRecommendationsForUser(userId: string, limit: number = 10): Promise<Recommendation[]> {
  return recommendationEngine.getRecommendationsForUser(userId, limit);
}

export async function recordRecommendationClick(recommendationId: string): Promise<void> {
  try {
    await pool.query(
      `UPDATE user_recommendations SET clicked = true, clicked_at = NOW() WHERE id = $1`,
      [recommendationId]
    );
  } catch {
    // Non-critical
  }
}

export async function generateRecommendations(userId: string): Promise<void> {
  await recommendationEngine.getRecommendationsForUser(userId);
}

export async function recordInteraction(
  userId: string,
  placeId: string,
  action: 'view' | 'like' | 'review' | 'book'
): Promise<void> {
  return recommendationEngine.recordInteraction(userId, placeId, action);
}

export async function getSimilarPlaces(placeId: string, limit: number = 5): Promise<Recommendation[]> {
  return recommendationEngine.getSimilarPlaces(placeId, limit);
}

export async function getTrendingPlaces(limit: number = 10): Promise<Recommendation[]> {
  try {
    const result = await pool.query(
      `SELECT id::text as place_id,
         COALESCE(rating, 0) as score,
         'Trend' as reason
       FROM places
       WHERE is_active = true
       ORDER BY review_count DESC, rating DESC
       LIMIT $1`,
      [limit]
    );
    return result.rows.map((r: any) => ({
      placeId: r.place_id,
      score: parseFloat(r.score) || 0,
      reason: r.reason
    }));
  } catch (error) {
    logger.error('getTrendingPlaces failed', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

export async function getPersonalizedRecommendations(userId: string, limit: number = 10): Promise<Recommendation[]> {
  return recommendationEngine.getRecommendationsForUser(userId, limit);
}

export default recommendationEngine;
