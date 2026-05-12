/**
 * GET /api/recommendations/hybrid — Hybrid place recommendations
 * Supports type: hybrid | content | collaborative | trending
 */

import type { APIRoute } from 'astro';
import { query } from '../../../lib/postgres';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId, safeIntParam } from '../../../lib/api';
import { logger } from '../../../lib/logger';
import { resolveContentImage } from '../../../lib/content-images';

function normalizeRecommendationImage(rows: { slug?: string; image_url?: string; [key: string]: unknown }[]) {
  return rows.map((row) => ({
    ...row,
    image_url: resolveContentImage({
      category: 'places',
      slug: row.slug ?? null,
      explicit: row.image_url ?? null,
      placeholder: '/images/placeholder-place.jpg',
    }),
  }));
}

export const GET: APIRoute = async ({ request, url, locals }) => {
  const requestId = getRequestId(request);

  try {
    const type = url.searchParams.get('type') || 'hybrid';
    const limit = safeIntParam(url.searchParams.get('limit'), 10, 1, 50);

    // For trending type (no auth required), return top-rated places
    if (type === 'trending' || !locals.user?.id) {
      const result = await query(
        `SELECT p.id, p.name, p.slug, p.category,
                COALESCE(p.rating, p.avg_rating, 0) as rating,
                COALESCE(p.thumbnail_url, p.images[1]) as image_url,
                'Şanlıurfa''da popüler' as reason,
                COALESCE(p.rating, p.avg_rating, 0) as score
         FROM places p
         WHERE p.status = 'active'
         ORDER BY COALESCE(p.rating, p.avg_rating, 0) DESC NULLS LAST, COALESCE(p.review_count, 0) DESC NULLS LAST
         LIMIT $1`,
        [limit]
      );
      const data = normalizeRecommendationImage(result.rows);
      return apiResponse({ success: true, data, count: data.length }, HttpStatus.OK, requestId);
    }

    const userId = locals.user.id;

    // Hybrid: mix of user favorites' categories and top-rated in those categories
    const result = await query(
      `SELECT DISTINCT p.id, p.name, p.slug, p.category,
              COALESCE(p.rating, p.avg_rating, 0) as rating,
              COALESCE(p.thumbnail_url, p.images[1]) as image_url,
              'Beğenilerinize göre' as reason,
              COALESCE(p.rating, p.avg_rating, 0) as score
       FROM places p
       WHERE p.status = 'active'
         AND p.id NOT IN (
           SELECT place_id FROM user_favorites WHERE user_id = $1
         )
         AND (
           p.category IN (
             SELECT pl.category FROM user_favorites f
             JOIN places pl ON pl.id = f.place_id
             WHERE f.user_id = $1
             LIMIT 5
           )
           OR COALESCE(p.rating, p.avg_rating, 0) >= 4.0
         )
       ORDER BY COALESCE(p.rating, p.avg_rating, 0) DESC NULLS LAST
       LIMIT $2`,
      [userId, limit]
    );

    // If user has no favorites, fall back to top-rated
    const rows = result.rows.length > 0 ? result.rows : (await query(
      `SELECT p.id, p.name, p.slug, p.category,
              COALESCE(p.rating, p.avg_rating, 0) as rating,
              COALESCE(p.thumbnail_url, p.images[1]) as image_url,
              'Şanlıurfa''da popüler' as reason,
              COALESCE(p.rating, p.avg_rating, 0) as score
       FROM places p WHERE p.status = 'active'
       ORDER BY COALESCE(p.rating, p.avg_rating, 0) DESC NULLS LAST LIMIT $1`,
      [limit]
    )).rows;

    const data = normalizeRecommendationImage(rows);
    return apiResponse({ success: true, data, count: data.length }, HttpStatus.OK, requestId);
  } catch (error) {
    logger.error('Recommendations hybrid failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Öneriler alınamadı', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
