/**
 * Mobile App API v2 - Places
 * Optimized for mobile applications with light payload
 */

import type { APIRoute } from 'astro';
import { query } from '../../../../lib/postgres';
import { logger } from '../../../../lib/logging';

export const GET: APIRoute = async ({ url }) => {
  try {
    const searchParams = url.searchParams;
    
    // Mobile-optimized parameters
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');
    const radius = parseInt(searchParams.get('radius') || '5000');
    const category = searchParams.get('category');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
    const offset = parseInt(searchParams.get('offset') || '0');

    let sql = `
      SELECT
        p.id, p.name, p.slug, p.description, p.address, p.district,
        p.rating, p.review_count, p.price_level,
        p.latitude, p.longitude, p.phone, p.website,
        c.name as category_name, c.icon as category_icon,
        ${lat && lng ? `
          ROUND((6371 * acos(
            cos(radians($1)) * cos(radians(p.latitude)) *
            cos(radians(p.longitude) - radians($2)) +
            sin(radians($1)) * sin(radians(p.latitude))
          ))::numeric, 2) as distance_km
        ` : '0 as distance_km'},
        CASE
          WHEN ph.is_closed = true THEN false
          WHEN ph.open_time IS NULL THEN NULL
          WHEN TO_CHAR(NOW() AT TIME ZONE 'Europe/Istanbul', 'HH24:MI') BETWEEN TO_CHAR(ph.open_time, 'HH24:MI') AND TO_CHAR(ph.close_time, 'HH24:MI') THEN true
          ELSE false
        END as is_open
      FROM places p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN place_hours ph ON ph.place_id = p.id AND ph.day_of_week = EXTRACT(DOW FROM NOW() AT TIME ZONE 'Europe/Istanbul')::int
      WHERE p.status = 'active'
    `;

    const params: any[] = [];
    let paramIndex = 1;
    
    if (lat && lng) {
      params.push(parseFloat(lat), parseFloat(lng));
      paramIndex = 3;
    }

    if (category) {
      sql += ` AND p.category_id = $${paramIndex++}`;
      params.push(category);
    }

    sql += ` ORDER BY ${lat && lng ? 'distance_km ASC,' : ''} p.rating DESC NULLS LAST`;
    sql += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(limit, offset);

    const result = await query(sql, params);

    return new Response(JSON.stringify({
      success: true,
      data: result.rows.map(place => ({
        ...place,
        distance: place.distance_km ? Math.round(place.distance_km * 1000) : null,
        main_image: `/uploads/photos/places/${place.id}/thumb.jpg`,
      })),
      pagination: { limit, offset, has_more: result.rows.length === limit },
      meta: { version: '2.0', api: 'mobile' }
    }), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300'
      }
    });

  } catch (error) {
    logger.error('API v2 places error:', error);
    return new Response(JSON.stringify({ success: false, error: 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
