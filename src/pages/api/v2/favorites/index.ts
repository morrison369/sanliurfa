/**
 * Mobile App API v2 - User Favorites
 */

import type { APIRoute } from 'astro';
import { verifyToken } from '../../../../lib/auth';
import { query } from '../../../../lib/postgres';
import { resolveContentImage } from '../../../../lib/content-images';
import { apiResponse, problemJson, HttpStatus } from '../../../../lib/api';

// GET /api/v2/favorites - List user favorites
export const GET: APIRoute = async ({ request }) => {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return problemJson({
        status: 401,
        title: 'Unauthorized',
        detail: 'Bearer token gerekli',
        type: '/problems/v2-favorites-unauthorized',
        instance: '/api/v2/favorites',
      });
    }

    const token = authHeader.slice(7);
    const user = await verifyToken(token);
    
    if (!user) {
      return problemJson({
        status: 401,
        title: 'Unauthorized',
        detail: 'Geçersiz token',
        type: '/problems/v2-favorites-token-invalid',
        instance: '/api/v2/favorites',
      });
    }

    const result = await query(`
      SELECT 
        f.id as favorite_id,
        f.created_at as favorited_at,
        p.id, p.name, p.slug, COALESCE(p.thumbnail_url, p.images[1]) as image_url,
        p.thumbnail_url, p.rating, p.review_count,
        p.price_range, p.address,
        c.name as category_name, c.icon as category_icon
      FROM favorites f
      JOIN places p ON f.place_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE f.user_id = $1 AND p.status = 'active'
      ORDER BY f.created_at DESC
    `, [user.userId]);

    const data = result.rows.map((row) => ({
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
      data,
      count: data.length
    }, HttpStatus.OK);

  } catch (error) {
    return problemJson({
      status: 500,
      title: 'Favoriler Alınamadı',
      detail: 'Sunucu hatası',
      type: '/problems/v2-favorites-get-failed',
      instance: '/api/v2/favorites',
    });
  }
};

// POST /api/v2/favorites - Add to favorites
export const POST: APIRoute = async ({ request }) => {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return problemJson({
        status: 401,
        title: 'Unauthorized',
        detail: 'Bearer token gerekli',
        type: '/problems/v2-favorites-unauthorized',
        instance: '/api/v2/favorites',
      });
    }

    const token = authHeader.slice(7);
    const user = await verifyToken(token);
    
    if (!user) {
      return problemJson({
        status: 401,
        title: 'Unauthorized',
        detail: 'Geçersiz token',
        type: '/problems/v2-favorites-token-invalid',
        instance: '/api/v2/favorites',
      });
    }

    const body = await request.json();
    const { place_id } = body;

    if (!place_id) {
      return problemJson({
        status: 400,
        title: 'Geçersiz İstek',
        detail: 'Place ID gerekli',
        type: '/problems/v2-favorites-validation',
        instance: '/api/v2/favorites',
      });
    }

    await query(
      `INSERT INTO favorites (user_id, place_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [user.userId, place_id]
    );

    return apiResponse({ success: true }, HttpStatus.CREATED);

  } catch (error) {
    return problemJson({
      status: 500,
      title: 'Favori Eklenemedi',
      detail: 'Sunucu hatası',
      type: '/problems/v2-favorites-create-failed',
      instance: '/api/v2/favorites',
    });
  }
};

// DELETE /api/v2/favorites - Remove from favorites
export const DELETE: APIRoute = async ({ request, url }) => {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return problemJson({
        status: 401,
        title: 'Unauthorized',
        detail: 'Bearer token gerekli',
        type: '/problems/v2-favorites-unauthorized',
        instance: '/api/v2/favorites',
      });
    }

    const token = authHeader.slice(7);
    const user = await verifyToken(token);
    
    if (!user) {
      return problemJson({
        status: 401,
        title: 'Unauthorized',
        detail: 'Geçersiz token',
        type: '/problems/v2-favorites-token-invalid',
        instance: '/api/v2/favorites',
      });
    }

    const placeId = url.searchParams.get('place_id');
    if (!placeId) {
      return problemJson({
        status: 400,
        title: 'Geçersiz İstek',
        detail: 'Place ID gerekli',
        type: '/problems/v2-favorites-validation',
        instance: '/api/v2/favorites',
      });
    }

    await query(
      `DELETE FROM favorites WHERE user_id = $1 AND place_id = $2`,
      [user.userId, placeId]
    );

    return apiResponse({ success: true }, HttpStatus.OK);

  } catch (error) {
    return problemJson({
      status: 500,
      title: 'Favori Silinemedi',
      detail: 'Sunucu hatası',
      type: '/problems/v2-favorites-delete-failed',
      instance: '/api/v2/favorites',
    });
  }
};
