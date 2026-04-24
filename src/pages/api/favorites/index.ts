// API: Favori işlemleri (PostgreSQL + Redis cache)
import type { APIRoute } from 'astro';
import { query, queryOne, insert, remove } from '../../../lib/postgres';
import { getCache, setCache, deleteCache } from '../../../lib/cache';
import { logActivity } from '../../../lib/activity';
import { logger } from '../../../lib/logging';
import { problemJson } from '../../../lib/api';

/**
 * Generate cache key for user favorites
 */
function generateFavoritesCacheKey(userId: string): string {
  return `favorites:user:${userId}`;
}

// Get user favorites
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
      return new Response(JSON.stringify(cached), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'X-Cache': 'HIT' }
      });
    }

    const result = await query(
      `SELECT f.*, p.name as place_name, p.images as place_images, p.rating as place_rating
       FROM favorites f
       JOIN places p ON f.place_id = p.id
       WHERE f.user_id = $1
       ORDER BY f.created_at DESC`,
      [user.id]
    );

    const responseData = { data: result.rows };

    // Cache for 5 minutes
    await setCache(cacheKey, responseData, 300);

    return new Response(JSON.stringify(responseData), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'X-Cache': 'MISS' }
    });
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

// Add to favorites
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

    // Check if already favorited
    const existing = await queryOne(
      'SELECT id FROM favorites WHERE place_id = $1 AND user_id = $2',
      [placeId, user.id]
    );

    if (existing) {
      return problemJson({
        status: 400,
        title: 'Geçersiz İstek',
        detail: 'Bu mekan zaten favorilerinizde',
        type: '/problems/favorites-already-exists',
        instance: '/api/favorites',
      });
    }

    const data = await insert('favorites', {
      place_id: placeId,
      user_id: user.id,
      created_at: new Date().toISOString()
    });

    // Add points (5 puan)
    await query('UPDATE users SET points = COALESCE(points, 0) + 5 WHERE id = $1', [user.id]);

    // Log activity
    const place = await queryOne('SELECT name FROM places WHERE id = $1', [placeId]);
    await logActivity(user.id, 'favorite_add', {
      entityType: 'place',
      entityId: placeId,
      metadata: { placeName: place?.name || 'Mekan', points: 5 }
    });

    // Invalidate user's favorites cache
    const cacheKey = generateFavoritesCacheKey(user.id);
    await deleteCache(cacheKey);

    return new Response(
      JSON.stringify({ data, message: 'Favorilere eklendi' }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
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

// Remove from favorites
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

    await query('DELETE FROM favorites WHERE place_id = $1 AND user_id = $2', [placeId, user.id]);

    // Invalidate user's favorites cache
    const cacheKey = generateFavoritesCacheKey(user.id);
    await deleteCache(cacheKey);

    return new Response(
      JSON.stringify({ message: 'Favorilerden kaldırıldı' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
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

