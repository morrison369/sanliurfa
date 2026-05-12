import type { APIRoute } from 'astro';
import { query } from '../../../lib/postgres';
import { authenticateUser } from '../../../lib/auth/middleware';
import { logger } from '../../../lib/logging';
import { resolveContentImage } from '../../../lib/content-images';
import { apiResponse, problemJson, HttpStatus } from '../../../lib/api';

// List user's favorite places
export const GET: APIRoute = async (context) => {
  try {
    const auth = await authenticateUser(context);
    if (!auth) {
      return problemJson({
        status: 401,
        title: 'Unauthorized',
        detail: 'Oturum açmanız gerekiyor',
        type: '/problems/user-favorites-unauthorized',
        instance: '/api/user/favorites',
      });
    }

    const result = await query(
      `SELECT p.id, p.name, p.slug, COALESCE(p.thumbnail_url, p.images[1]) as image_url, p.thumbnail_url, p.category, p.rating, p.price_range, p.address
       FROM user_favorites uf
       JOIN places p ON uf.place_id = p.id
       WHERE uf.user_id = $1 AND p.status = 'active'
       ORDER BY uf.created_at DESC`,
      [auth.user.id]
    );

    const favorites = result.rows.map((row) => ({
      ...row,
      image_url: resolveContentImage({
        category: 'places',
        slug: row.slug,
        explicit: row.image_url || row.thumbnail_url,
        placeholder: '/images/placeholder-place.jpg',
      }),
      thumbnail_url: resolveContentImage({
        category: 'places',
        slug: row.slug,
        explicit: row.thumbnail_url || row.image_url,
        placeholder: '/images/placeholder-place.jpg',
        thumb: true,
      }),
    }));

    return apiResponse({
      success: true,
      favorites
    }, HttpStatus.OK);

  } catch (error) {
    logger.error('Get favorites error:', error);
    return problemJson({
      status: 500,
      title: 'Favoriler Alınamadı',
      detail: 'Sunucu hatası',
      type: '/problems/user-favorites-get-failed',
      instance: '/api/user/favorites',
    });
  }
};

// Add to favorites
export const POST: APIRoute = async (context) => {
  try {
    const auth = await authenticateUser(context);
    if (!auth) {
      return problemJson({
        status: 401,
        title: 'Unauthorized',
        detail: 'Oturum açmanız gerekiyor',
        type: '/problems/user-favorites-unauthorized',
        instance: '/api/user/favorites',
      });
    }

    const body = await context.request.json();
    const { placeId } = body;

    if (!placeId || typeof placeId !== 'string') {
      return problemJson({
        status: 400,
        title: 'Geçersiz İstek',
        detail: 'placeId gerekli',
        type: '/problems/user-favorites-validation',
        instance: '/api/user/favorites',
      });
    }

    // Check if already favorited
    const existing = await query(
      'SELECT id FROM user_favorites WHERE user_id = $1 AND place_id = $2',
      [auth.user.id, placeId]
    );

    if (existing.rows.length > 0) {
      return apiResponse({ 
        success: true,
        message: 'Already in favorites'
      }, HttpStatus.OK);
    }

    await query(
      'INSERT INTO user_favorites (user_id, place_id) VALUES ($1, $2)',
      [auth.user.id, placeId]
    );

    return apiResponse({
      success: true,
      message: 'Added to favorites'
    }, HttpStatus.CREATED);

  } catch (error) {
    logger.error('Add favorite error:', error);
    return problemJson({
      status: 500,
      title: 'Favori Eklenemedi',
      detail: 'Sunucu hatası',
      type: '/problems/user-favorites-create-failed',
      instance: '/api/user/favorites',
    });
  }
};

// Remove from user_favorites
export const DELETE: APIRoute = async (context) => {
  try {
    const auth = await authenticateUser(context);
    if (!auth) {
      return problemJson({
        status: 401,
        title: 'Unauthorized',
        detail: 'Oturum açmanız gerekiyor',
        type: '/problems/user-favorites-unauthorized',
        instance: '/api/user/favorites',
      });
    }

    const url = new URL(context.request.url);
    const placeId = url.searchParams.get('placeId');

    if (!placeId) {
      return problemJson({
        status: 400,
        title: 'Geçersiz İstek',
        detail: 'placeId gerekli',
        type: '/problems/user-favorites-validation',
        instance: '/api/user/favorites',
      });
    }

    await query(
      'DELETE FROM user_favorites WHERE user_id = $1 AND place_id = $2',
      [auth.user.id, placeId]
    );

    return apiResponse({
      success: true,
      message: 'Removed from user_favorites'
    }, HttpStatus.OK);

  } catch (error) {
    logger.error('Remove favorite error:', error);
    return problemJson({
      status: 500,
      title: 'Favori Silinemedi',
      detail: 'Sunucu hatası',
      type: '/problems/user-favorites-delete-failed',
      instance: '/api/user/favorites',
    });
  }
};
