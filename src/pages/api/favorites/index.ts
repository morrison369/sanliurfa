// API: Favori işlemleri (PostgreSQL + Redis cache)
import type { APIRoute } from 'astro';
import { query, queryOne } from '../../../lib/postgres';
import { getCache, setCache, deleteCache } from '../../../lib/cache';
import { logActivity } from '../../../lib/activity';
import { logger } from '../../../lib/logging';
import { apiResponse, problemJson, HttpStatus } from '../../../lib/api';

/**
 * Generate cache key for user user_favorites
 */
function generateFavoritesCacheKey(userId: string): string {
  return `user_favorites:user:${userId}`;
}

// Get user user_favorites
export const GET: APIRoute = async ({ locals }) => {
  try {
    const user = locals.user;

    if (!user) {
      return problemJson({
        status: 401,
        title: 'Unauthorized',
        detail: 'Oturum açmanız gerekiyor',
        type: '/problems/favorites-unauthorized',
        instance: '/api/favorites',
      });
    }

    // Try to get from cache
    const cacheKey = generateFavoritesCacheKey(user.id);
    const cached = await getCache<{ data: any[] }>(cacheKey);

    if (cached) {
      return apiResponse(cached, HttpStatus.OK);
    }

    const result = await query(
      `SELECT f.*, p.name as place_name, p.images as place_images, p.rating as place_rating
       FROM user_favorites f
       JOIN places p ON f.place_id = p.id
       WHERE f.user_id = $1
       ORDER BY f.created_at DESC`,
      [user.id]
    );

    const responseData = { data: result.rows };

    // Cache for 5 minutes
    await setCache(cacheKey, responseData, 300);

    return apiResponse(responseData, HttpStatus.OK);
  } catch (err) {
    logger.error('Favorites fetch error:', err);
    return problemJson({
      status: 500,
      title: 'Favoriler Alınamadı',
      detail: 'Favoriler getirilirken bir hata oluştu',
      type: '/problems/favorites-get-failed',
      instance: '/api/favorites',
    });
  }
};

// Add to user_favorites
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const user = locals.user;
    if (!user) {
      return problemJson({
        status: 401,
        title: 'Unauthorized',
        detail: 'Oturum açmanız gerekiyor',
        type: '/problems/favorites-unauthorized',
        instance: '/api/favorites',
      });
    }

    const body = await request.json();
    const { placeId } = body;

    if (!placeId) {
      return problemJson({
        status: 400,
        title: 'Geçersiz İstek',
        detail: 'Mekan ID gereklidir',
        type: '/problems/favorites-validation',
        instance: '/api/favorites',
      });
    }

    // Atomic INSERT — ON CONFLICT eliminates SELECT→INSERT race (HARD RULE #47)
    const insertResult = await query(
      `INSERT INTO user_favorites (place_id, user_id, created_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (place_id, user_id) DO NOTHING
       RETURNING id, place_id, user_id, created_at`,
      [placeId, user.id]
    );

    if (insertResult.rows.length === 0) {
      return problemJson({
        status: 400,
        title: 'Geçersiz İstek',
        detail: 'Bu mekan zaten favorilerinizde',
        type: '/problems/favorites-already-exists',
        instance: '/api/favorites',
      });
    }

    const data = insertResult.rows[0];

    // Add points (5 puan)
    await query('UPDATE users SET points = COALESCE(points, 0) + 5 WHERE id = $1', [user.id]);

    // Log activity
    const place = await queryOne('SELECT name FROM places WHERE id = $1', [placeId]);
    await logActivity(user.id, 'favorite_add', {
      entityType: 'place',
      entityId: placeId,
      metadata: { placeName: place?.name || 'Mekan', points: 5 }
    });

    // Invalidate user's user_favorites cache
    const cacheKey = generateFavoritesCacheKey(user.id);
    await deleteCache(cacheKey);

    return apiResponse({ data, message: 'Favorilere eklendi' }, HttpStatus.CREATED);
  } catch (err) {
    logger.error('Favorite add error:', err);
    return problemJson({
      status: 500,
      title: 'Favori Eklenemedi',
      detail: 'Favori eklenirken bir hata oluştu',
      type: '/problems/favorites-create-failed',
      instance: '/api/favorites',
    });
  }
};

// Remove from user_favorites
export const DELETE: APIRoute = async ({ request, locals }) => {
  try {
    const user = locals.user;
    if (!user) {
      return problemJson({
        status: 401,
        title: 'Unauthorized',
        detail: 'Oturum açmanız gerekiyor',
        type: '/problems/favorites-unauthorized',
        instance: '/api/favorites',
      });
    }

    const body = await request.json();
    const { placeId } = body;

    if (!placeId) {
      return problemJson({
        status: 400,
        title: 'Geçersiz İstek',
        detail: 'Mekan ID gereklidir',
        type: '/problems/favorites-validation',
        instance: '/api/favorites',
      });
    }

    await query('DELETE FROM user_favorites WHERE place_id = $1 AND user_id = $2', [placeId, user.id]);

    // Invalidate user's user_favorites cache
    const cacheKey = generateFavoritesCacheKey(user.id);
    await deleteCache(cacheKey);

    return apiResponse({ message: 'Favorilerden kaldırıldı' }, HttpStatus.OK);
  } catch (err) {
    logger.error('Favorite remove error:', err);
    return problemJson({
      status: 500,
      title: 'Favori Kaldırılamadı',
      detail: 'Favori kaldırılırken bir hata oluştu',
      type: '/problems/favorites-delete-failed',
      instance: '/api/favorites',
    });
  }
};

