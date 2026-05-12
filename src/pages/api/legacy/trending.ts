import type { APIRoute } from 'astro';
import { queryMany } from '../../../lib/postgres';
import { logger } from '../../../lib/logging';
import { resolveContentImage } from '../../../lib/content-images';
import { apiResponse, problemJson, HttpStatus, safeIntParam } from '../../../lib/api';

export const GET: APIRoute = async ({ url }) => {
  try {
    const limit = safeIntParam(url.searchParams.get('limit'), 20, 1, 100);
    const type = url.searchParams.get('type') || 'all';

    let query = '';

    if (type === 'places' || type === 'all') {
      query = `SELECT p.id, p.slug, p.name, p.category,
                      COALESCE(p.thumbnail_url, p.images[1]) as image_url,
                      AVG(r.rating) as avg_rating,
                      COUNT(r.id) as review_count,
                      COUNT(f.id) as favorite_count
               FROM places p
               LEFT JOIN reviews r ON p.id = r.place_id AND r.created_at > NOW() - INTERVAL '30 days'
               LEFT JOIN user_favorites f ON p.id = f.place_id AND f.created_at > NOW() - INTERVAL '30 days'
               WHERE p.status = 'active'
               GROUP BY p.id
               ORDER BY favorite_count DESC, review_count DESC
               LIMIT $1`;
    }

    const result = await queryMany(query, [limit]);
    const data = (result || []).map((row) => ({
      ...row,
      image_url: resolveContentImage({
        category: 'places',
        slug: row.slug,
        explicit: row.image_url,
        placeholder: '/images/placeholder-place.jpg',
      }),
    }));

    return apiResponse({
      success: true,
      data,
      type
    }, HttpStatus.OK);
  } catch (error) {
    logger.error('Trending error', error);
    const response = problemJson({
      status: 500,
      title: 'Trend Verisi Alınamadı',
      detail: 'Failed',
      type: '/problems/legacy-trending-failed',
      instance: '/api/legacy/trending',
    });
    response.headers.set('X-API-Legacy', 'true');
    return response;
  }
};
