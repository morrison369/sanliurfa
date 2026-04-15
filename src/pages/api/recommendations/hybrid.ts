/**
 * GET /api/recommendations/hybrid — Hybrid place recommendations
 * Supports type: hybrid | content | collaborative | trending
 */

import type { APIRoute } from 'astro';
import { query } from '../../../lib/postgres';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { logger } from '../../../lib/logger';

export const GET: APIRoute = async ({ request, url, locals }) => {
  const requestId = getRequestId({ request } as any);

  try {
    const type = url.searchParams.get('type') || 'hybrid';
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '10'), 50);

    // For trending type (no auth required), return top-rated places
    if (type === 'trending' || !locals.user?.id) {
      const result = await query(
        `SELECT p.id, p.name, p.slug, p.category, p.average_rating as rating,
                p.main_image as image_url, p.district,
                'Şanlıurfa''da popüler' as reason,
                p.average_rating as score
         FROM places p
         WHERE p.is_active = true
         ORDER BY p.average_rating DESC NULLS LAST, p.total_reviews DESC NULLS LAST
         LIMIT $1`,
        [limit]
      );
      return apiResponse({ success: true, data: result.rows, count: result.rows.length }, HttpStatus.OK, requestId);
    }

    const userId = locals.user.id;

    // Hybrid: mix of user favorites' categories and top-rated in those categories
    const result = await query(
      `SELECT DISTINCT p.id, p.name, p.slug, p.category, p.average_rating as rating,
              p.main_image as image_url, p.district,
              'Beğenilerinize göre' as reason,
              p.average_rating as score
       FROM places p
       WHERE p.is_active = true
         AND p.id NOT IN (
           SELECT place_id FROM favorites WHERE user_id = $1
         )
         AND (
           p.category IN (
             SELECT pl.category FROM favorites f
             JOIN places pl ON pl.id = f.place_id
             WHERE f.user_id = $1
             LIMIT 5
           )
           OR p.average_rating >= 4.0
         )
       ORDER BY p.average_rating DESC NULLS LAST
       LIMIT $2`,
      [userId, limit]
    );

    // If user has no favorites, fall back to top-rated
    const rows = result.rows.length > 0 ? result.rows : (await query(
      `SELECT p.id, p.name, p.slug, p.category, p.average_rating as rating,
              p.main_image as image_url, p.district,
              'Şanlıurfa''da popüler' as reason,
              p.average_rating as score
       FROM places p WHERE p.is_active = true
       ORDER BY p.average_rating DESC NULLS LAST LIMIT $1`,
      [limit]
    )).rows;

    return apiResponse({ success: true, data: rows, count: rows.length }, HttpStatus.OK, requestId);
  } catch (error) {
    logger.error('Recommendations hybrid failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Öneriler alınamadı', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
