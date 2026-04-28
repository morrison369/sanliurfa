/**
 * API v1 - Places Endpoint
 * Stable API version with backward compatibility
 */

import type { APIRoute } from 'astro';
import { query } from '../../../lib/postgres';
import { logger } from '../../../lib/logging';
import { problemJson, safeIntParam } from '../../../lib/api';

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const page = safeIntParam(url.searchParams.get('page'), 1, 1, 1_000_000);
  const limit = safeIntParam(url.searchParams.get('limit'), 20, 1, 100);
  const offset = (page - 1) * limit;
  const category = url.searchParams.get('category');

  try {
    const params: unknown[] = [];
    let where = `WHERE p.status = 'active'`;
    let idx = 1;

    if (category) {
      where += ` AND (p.category = $${idx} OR c.slug = $${idx})`;
      params.push(category);
      idx++;
    }

    const countResult = await query(
      `SELECT COUNT(*) FROM places p LEFT JOIN categories c ON c.id = p.category_id ${where}`,
      params
    );
    const total = parseInt(countResult.rows[0].count || '0');

    const dataResult = await query(
      `SELECT
         p.id, p.name, p.slug, p.description, p.address,
         p.latitude, p.longitude, p.rating, p.review_count,
         p.images, p.status, p.created_at, p.updated_at,
         COALESCE(p.category, c.slug) AS category
       FROM places p
       LEFT JOIN categories c ON c.id = p.category_id
       ${where}
       ORDER BY p.rating DESC NULLS LAST
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, limit, offset]
    );

    const places = dataResult.rows.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      description: p.description,
      category: p.category,
      rating: parseFloat(p.rating) || 0,
      review_count: p.review_count || 0,
      location: p.latitude && p.longitude ? { lat: parseFloat(p.latitude), lon: parseFloat(p.longitude) } : null,
      image: p.images?.[0] || null,
      address: p.address,
      is_active: p.status === 'active',
      created_at: p.created_at,
      updated_at: p.updated_at,
    }));

    return new Response(
      JSON.stringify({
        data: places,
        meta: {
          page,
          limit,
          total,
          total_pages: Math.ceil(total / limit),
          has_more: offset + limit < total,
        },
        api_version: 'v1',
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-API-Version': 'v1',
        },
      }
    );
  } catch (error) {
    logger.error('API v1 places error:', error);
    const response = problemJson({
      status: 500,
      title: 'Mekanlar Alınamadı',
      detail: 'Server error',
      type: '/problems/v1-places-get-failed',
      instance: '/api/v1/places',
    });
    response.headers.set('X-API-Version', 'v1');
    return response;
  }
};

// POST: Create place — redirect to the proper apply endpoint
export const POST: APIRoute = async (_ctx) => {
  const response = problemJson({
    status: 405,
    title: 'Method Not Allowed',
    detail: 'Use /api/places/apply to submit a new place',
    type: '/problems/v1-places-post-not-allowed',
    instance: '/api/v1/places',
  });
  response.headers.set('X-API-Version', 'v1');
  return response;
};
