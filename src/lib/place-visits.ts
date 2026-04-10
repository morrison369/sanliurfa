/**
 * Place Visit History System
 * Track user visits to places with notes and ratings
 */

import { query, queryOne, queryRows, insert, update } from './postgres';
import { getCache, setCache, deleteCache } from './cache';
import { logger } from './logging';

export interface PlaceVisit {
  id: string;
  userId: string;
  placeId: string;
  visitedAt: string;
  notes?: string;
  rating?: number;
  durationMinutes?: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Record a place visit
 */
export async function recordPlaceVisit(
  userId: string,
  placeId: string,
  visitedAt: Date = new Date(),
  notes?: string,
  rating?: number,
  durationMinutes?: number
): Promise<PlaceVisit | null> {
  try {
    // Insert visit record
    const result = await insert('place_visits', {
      user_id: userId,
      place_id: placeId,
      visited_at: visitedAt,
      notes,
      rating: rating && rating >= 0 && rating <= 5 ? rating : null,
      duration_minutes: durationMinutes
    });

    // Update visit count on places table
    await query(
      `UPDATE places SET visit_count = (SELECT COUNT(*) FROM place_visits WHERE place_id = $1) WHERE id = $1`,
      [placeId]
    );

    // Invalidate cache
    await deleteCache(`sanliurfa:user:visits:${userId}`);

    logger.info('Place visit recorded', { userId, placeId });

    return {
      id: result.id,
      userId,
      placeId,
      visitedAt: visitedAt.toISOString(),
      notes,
      rating,
      durationMinutes,
      createdAt: result.created_at,
      updatedAt: result.updated_at
    };
  } catch (error) {
    logger.error('Failed to record place visit', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

/**
 * Get user's visit history
 */
export async function getUserVisits(userId: string, limit: number = 50): Promise<PlaceVisit[]> {
  try {
    const cacheKey = `sanliurfa:user:visits:${userId}`;
    const cached = await getCache(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const results = await queryRows(
      `SELECT id, user_id, place_id, visited_at, notes, rating, duration_minutes, created_at, updated_at
       FROM place_visits
       WHERE user_id = $1
       ORDER BY visited_at DESC
       LIMIT $2`,
      [userId, limit]
    );

    const visits: PlaceVisit[] = results.map((r: any) => ({
      id: r.id,
      userId: r.user_id,
      placeId: r.place_id,
      visitedAt: r.visited_at,
      notes: r.notes,
      rating: r.rating ? parseFloat(r.rating) : undefined,
      durationMinutes: r.duration_minutes,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }));

    // Cache for 30 minutes
    await setCache(cacheKey, JSON.stringify(visits), 1800);

    return visits;
  } catch (error) {
    logger.error('Failed to get user visits', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

/**
 * Get visit statistics for a user
 */
export async function getUserVisitStats(userId: string): Promise<any> {
  try {
    const cacheKey = `sanliurfa:user:visit-stats:${userId}`;
    const cached = await getCache(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const result = await queryOne(
      `SELECT
        COUNT(*) as total_visits,
        COUNT(DISTINCT place_id) as unique_places,
        AVG(rating) as avg_rating,
        MAX(visited_at) as last_visit,
        SUM(COALESCE(duration_minutes, 0)) as total_minutes
       FROM place_visits
       WHERE user_id = $1`,
      [userId]
    );

    const stats = {
      totalVisits: result?.total_visits || 0,
      uniquePlaces: result?.unique_places || 0,
      averageRating: result?.avg_rating ? parseFloat(result.avg_rating).toFixed(2) : null,
      lastVisit: result?.last_visit,
      totalMinutes: result?.total_minutes || 0
    };

    // Cache for 1 hour
    await setCache(cacheKey, JSON.stringify(stats), 3600);

    return stats;
  } catch (error) {
    logger.error('Failed to get visit stats', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

/**
 * Update a visit record
 */
export async function updatePlaceVisit(
  visitId: string,
  userId: string,
  notes?: string,
  rating?: number,
  durationMinutes?: number
): Promise<PlaceVisit | null> {
  try {
    // Verify ownership
    const visit = await queryOne('SELECT place_id, user_id FROM place_visits WHERE id = $1', [visitId]);
    if (!visit || visit.user_id !== userId) {
      return null;
    }

    // Update visit
    await query(
      `UPDATE place_visits
       SET notes = COALESCE($1, notes),
           rating = COALESCE($2, rating),
           duration_minutes = COALESCE($3, duration_minutes),
           updated_at = NOW()
       WHERE id = $4`,
      [notes, rating, durationMinutes, visitId]
    );

    // Invalidate cache
    await deleteCache(`sanliurfa:user:visits:${userId}`);

    logger.info('Place visit updated', { visitId, userId });

    const updated = await queryOne(
      'SELECT id, user_id, place_id, visited_at, notes, rating, duration_minutes, created_at, updated_at FROM place_visits WHERE id = $1',
      [visitId]
    );

    if (!updated) return null;

    return {
      id: updated.id,
      userId: updated.user_id,
      placeId: updated.place_id,
      visitedAt: updated.visited_at,
      notes: updated.notes,
      rating: updated.rating ? parseFloat(updated.rating) : undefined,
      durationMinutes: updated.duration_minutes,
      createdAt: updated.created_at,
      updatedAt: updated.updated_at
    };
  } catch (error) {
    logger.error('Failed to update visit', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

/**
 * Delete a visit record
 */
export async function deletePlaceVisit(visitId: string, userId: string): Promise<boolean> {
  try {
    // Verify ownership
    const visit = await queryOne('SELECT user_id, place_id FROM place_visits WHERE id = $1', [visitId]);
    if (!visit || visit.user_id !== userId) {
      return false;
    }

    // Delete visit
    await query('DELETE FROM place_visits WHERE id = $1', [visitId]);

    // Update visit count
    await query(
      `UPDATE places SET visit_count = (SELECT COUNT(*) FROM place_visits WHERE place_id = $1) WHERE id = $1`,
      [visit.place_id]
    );

    // Invalidate cache
    await deleteCache(`sanliurfa:user:visits:${userId}`);

    logger.info('Place visit deleted', { visitId, userId });
    return true;
  } catch (error) {
    logger.error('Failed to delete visit', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

/**
 * Get places visited by user with details
 */
export async function getUserVisitedPlaces(userId: string, limit: number = 30): Promise<any[]> {
  try {
    const results = await queryRows(
      `SELECT
        p.id, p.name, p.category, p.rating, p.image_url,
        COUNT(pv.id) as visit_count,
        MAX(pv.visited_at) as last_visit,
        AVG(pv.rating) as avg_rating
       FROM place_visits pv
       JOIN places p ON pv.place_id = p.id
       WHERE pv.user_id = $1
       GROUP BY p.id
       ORDER BY last_visit DESC
       LIMIT $2`,
      [userId, limit]
    );

    return results.map((r: any) => ({
      id: r.id,
      name: r.name,
      category: r.category,
      rating: r.rating,
      image: r.image_url,
      visitCount: r.visit_count,
      lastVisit: r.last_visit,
      averageRating: r.avg_rating ? parseFloat(r.avg_rating).toFixed(1) : null
    }));
  } catch (error) {
    logger.error('Failed to get visited places', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

/**
 * Get most visited places by user
 */
export async function getMostVisitedPlaces(userId: string, limit: number = 10): Promise<any[]> {
  try {
    const results = await queryRows(
      `SELECT
        p.id, p.name, p.category, p.rating,
        COUNT(pv.id) as visit_count
       FROM place_visits pv
       JOIN places p ON pv.place_id = p.id
       WHERE pv.user_id = $1
       GROUP BY p.id
       ORDER BY visit_count DESC
       LIMIT $2`,
      [userId, limit]
    );

    return results.map((r: any) => ({
      id: r.id,
      name: r.name,
      category: r.category,
      rating: r.rating,
      visitCount: r.visit_count
    }));
  } catch (error) {
    logger.error('Failed to get most visited places', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}
