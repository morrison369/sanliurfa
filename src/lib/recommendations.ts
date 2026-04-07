import { pool } from './postgres';
import { logger } from './logging';
import { prefixKey, getCache, setCache } from './cache';

export async function getSimilarPlaces(placeId: string, limit: number = 5): Promise<any[]> {
  try {
    const cacheKey = prefixKey(`similar:${placeId}`);
    const cached = await getCache(cacheKey);
    if (cached) return JSON.parse(cached);

    const result = await pool.query(
      `SELECT p.id, p.name, p.category, p.rating, COUNT(r.id) as review_count
       FROM places p
       LEFT JOIN reviews r ON p.id = r.place_id
       WHERE p.category = (SELECT category FROM places WHERE id = $1)
       AND p.id != $1
       GROUP BY p.id
       ORDER BY p.rating DESC
       LIMIT $2`,
      [placeId, limit]
    );

    await setCache(cacheKey, JSON.stringify(result.rows), 3600);
    return result.rows;
  } catch (error) {
    logger.error('Similar places failed', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

export async function getTrendingPlaces(limit: number = 5): Promise<any[]> {
  try {
    const cacheKey = prefixKey('trending');
    const cached = await getCache(cacheKey);
    if (cached) return JSON.parse(cached);

    const result = await pool.query(
      `SELECT p.id, p.name, p.category, p.rating, COUNT(r.id) as recent_reviews
       FROM places p
       LEFT JOIN reviews r ON p.id = r.place_id AND r.created_at > NOW() - INTERVAL '7 days'
       GROUP BY p.id
       ORDER BY recent_reviews DESC, p.rating DESC
       LIMIT $1`,
      [limit]
    );

    await setCache(cacheKey, JSON.stringify(result.rows), 1800);
    return result.rows;
  } catch (error) {
    logger.error('Trending places failed', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

export async function getPersonalizedRecommendations(userId: string, limit: number = 5): Promise<any[]> {
  try {
    const result = await pool.query(
      `SELECT DISTINCT p.id, p.name, p.category, p.rating
       FROM places p
       WHERE p.category IN (
         SELECT DISTINCT category FROM places
         WHERE id IN (SELECT place_id FROM favorites WHERE user_id = $1)
       )
       AND p.id NOT IN (SELECT place_id FROM favorites WHERE user_id = $1)
       LIMIT $2`,
      [userId, limit]
    );

    return result.rows;
  } catch (error) {
    logger.error('Personalized recommendations failed', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}
