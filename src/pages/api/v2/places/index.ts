/**
 * Mobile App API v2 - Places
 * Optimized for mobile applications with light payload
 */

import type { APIRoute } from 'astro';
import { query } from '../../../../lib/postgres';

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
        ` : '0 as distance_km'}
      FROM places p
      LEFT JOIN categories c ON p.category_id = c.id
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
        main_image: `/images/places/${place.id}/thumb.jpg`,
        is_open: Math.random() > 0.3, // Placeholder
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
    console.error('API v2 places error:', error);
    return new Response(JSON.stringify({ success: false, error: 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
