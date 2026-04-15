// @ts-nocheck
/**
 * Mobile Places API
 * Optimized for mobile apps with offline sync support
 */

import type { APIRoute } from 'astro';
import { query, queryOne } from '../../../lib/postgres';
import { logger } from '../../../lib/logging';

// GET: List places with pagination
export const GET: APIRoute = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);
    const offset = (page - 1) * limit;
    const category = url.searchParams.get('category');
    const lat = url.searchParams.get('lat');
    const lon = url.searchParams.get('lon');
    const radius = url.searchParams.get('radius'); // km

    const params: any[] = [];
    let where = `WHERE p.status = 'active'`;
    let idx = 1;

    if (category) {
      where += ` AND (p.category = $${idx} OR c.slug = $${idx})`;
      params.push(category);
      idx++;
    }

    // Geo filter via Haversine in SQL
    if (lat && lon && radius) {
      where += ` AND (
        6371 * acos(
          cos(radians($${idx})) * cos(radians(p.latitude)) *
          cos(radians(p.longitude) - radians($${idx + 1})) +
          sin(radians($${idx})) * sin(radians(p.latitude))
        )
      ) <= $${idx + 2}`;
      params.push(parseFloat(lat), parseFloat(lon), parseFloat(radius));
      idx += 3;
    }

    const countResult = await query(
      `SELECT COUNT(*) FROM places p LEFT JOIN categories c ON c.id = p.category_id ${where}`,
      params
    );
    const total = parseInt(countResult.rows[0].count || '0');

    const dataResult = await query(
      `SELECT
         p.id, p.slug, p.name, p.description, p.address,
         p.latitude, p.longitude, p.rating, p.review_count,
         p.images, p.phone, p.open_hours, p.price_range, p.tags,
         p.updated_at,
         COALESCE(p.category, c.slug) AS category
       FROM places p
       LEFT JOIN categories c ON c.id = p.category_id
       ${where}
       ORDER BY p.rating DESC NULLS LAST
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, limit, offset]
    );

    const places = dataResult.rows.map((p: any) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      category: p.category,
      rating: parseFloat(p.rating) || 0,
      reviewCount: p.review_count || 0,
      location: p.latitude && p.longitude
        ? { lat: parseFloat(p.latitude), lon: parseFloat(p.longitude) }
        : null,
      images: p.images || [],
      address: p.address,
      phone: p.phone,
      openHours: p.open_hours,
      priceRange: p.price_range,
      tags: p.tags || [],
      lastUpdated: p.updated_at,
    }));

    return new Response(
      JSON.stringify({
        success: true,
        places,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    logger.error('Mobile places error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch places' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// POST: Sync places updated since lastSync
export const POST: APIRoute = async ({ request }) => {
  try {
    const { lastSync, categories } = await request.json();

    const since = lastSync ? new Date(lastSync) : new Date(0);

    let where = `WHERE p.status = 'active' AND p.updated_at > $1`;
    const params: any[] = [since];
    let idx = 2;

    if (categories && Array.isArray(categories) && categories.length > 0) {
      where += ` AND (p.category = ANY($${idx}) OR c.slug = ANY($${idx}))`;
      params.push(categories);
      idx++;
    }

    const result = await query(
      `SELECT p.id, p.slug, p.name, p.rating, p.review_count, p.updated_at
       FROM places p
       LEFT JOIN categories c ON c.id = p.category_id
       ${where}
       ORDER BY p.updated_at DESC
       LIMIT 200`,
      params
    );

    const updates = result.rows.map((p: any) => ({
      id: p.id,
      action: 'update',
      data: {
        rating: parseFloat(p.rating) || 0,
        reviewCount: p.review_count || 0,
        lastUpdated: p.updated_at,
      },
    }));

    return new Response(
      JSON.stringify({
        success: true,
        updates,
        timestamp: new Date().toISOString(),
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Sync failed' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
