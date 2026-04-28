/**
 * Mobile Places API
 * Optimized for mobile apps with offline sync support
 */

import type { APIRoute } from 'astro';
import { query } from '../../../lib/postgres';
import { logger } from '../../../lib/logging';
import { resolveContentImage } from '../../../lib/content-images';
import { problemJson, safeIntParam } from '../../../lib/api';

interface MobilePlaceRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  address: string | null;
  latitude: string | number | null;
  longitude: string | number | null;
  rating: string | number | null;
  review_count: string | number | null;
  images: string[] | null;
  phone: string | null;
  open_hours: unknown;
  price_range: string | null;
  tags: string[] | null;
  updated_at: string | Date | null;
  category: string | null;
}

interface SyncPlaceRow {
  id: string;
  rating: string | number | null;
  review_count: string | number | null;
  updated_at: string | Date | null;
}

interface SyncRequestBody {
  lastSync?: string;
  categories?: string[];
}

function toNumber(value: string | number | null | undefined): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') {
    const n = parseFloat(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

// GET: List places with pagination
export const GET: APIRoute = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const page = safeIntParam(url.searchParams.get('page'), 1, 1, 1_000_000);
    const limit = safeIntParam(url.searchParams.get('limit'), 20, 1, 100);
    const offset = (page - 1) * limit;
    const category = url.searchParams.get('category');
    const lat = url.searchParams.get('lat');
    const lon = url.searchParams.get('lon');
    const radius = url.searchParams.get('radius'); // km

    const params: Array<string | number> = [];
    let where = `WHERE p.status = 'active'`;
    let idx = 1;

    if (category) {
      where += ` AND (p.category = $${idx} OR c.slug = $${idx})`;
      params.push(category);
      idx++;
    }

    // Geo filter via Haversine in SQL
    if (lat && lon && radius) {
      const latNum = toNumber(lat);
      const lonNum = toNumber(lon);
      const radiusNum = toNumber(radius);
      if (latNum !== null && lonNum !== null && radiusNum !== null && radiusNum > 0) {
        where += ` AND (
          6371 * acos(
            cos(radians($${idx})) * cos(radians(p.latitude)) *
            cos(radians(p.longitude) - radians($${idx + 1})) +
            sin(radians($${idx})) * sin(radians(p.latitude))
          )
        ) <= $${idx + 2}`;
        params.push(latNum, lonNum, radiusNum);
        idx += 3;
      }
    }

    const countResult = await query(
      `SELECT COUNT(*) FROM places p LEFT JOIN categories c ON c.id = p.category_id ${where}`,
      params
    );
    const total = Number.parseInt(countResult.rows[0].count || '0', 10) || 0;

    const dataResult = await query<MobilePlaceRow>(
      `SELECT
         p.id, p.slug, p.name, p.description, p.address,
         p.latitude, p.longitude, p.rating, p.review_count,
         p.images, p.phone, p.opening_hours as open_hours, p.price_range, p.tags,
         p.updated_at,
         COALESCE(p.category, c.slug) AS category
       FROM places p
       LEFT JOIN categories c ON c.id = p.category_id
       ${where}
       ORDER BY p.rating DESC NULLS LAST
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, limit, offset]
    );

    const places = dataResult.rows.map((p) => {
      const normalizedImages = Array.isArray(p.images) && p.images.length > 0
        ? p.images
        : [
            resolveContentImage({
              category: 'places',
              slug: p.slug,
              explicit: null,
              placeholder: '/images/placeholder-place.jpg',
            }),
          ];

      return {
        id: p.id,
        slug: p.slug,
        name: p.name,
        description: p.description,
        category: p.category,
        rating: toNumber(p.rating) || 0,
        reviewCount: p.review_count || 0,
        location: p.latitude && p.longitude
          ? { lat: toNumber(p.latitude), lon: toNumber(p.longitude) }
          : null,
        images: normalizedImages,
        thumbnail: resolveContentImage({
          category: 'places',
          slug: p.slug,
          explicit: normalizedImages[0],
          placeholder: '/images/placeholder-place.jpg',
          thumb: true,
        }),
        address: p.address,
        phone: p.phone,
        openHours: p.open_hours,
        priceRange: p.price_range,
        tags: p.tags || [],
        lastUpdated: p.updated_at,
      };
    });

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
    return problemJson({
      status: 500,
      title: 'Mobil Mekan Hatası',
      detail: 'Mekanlar alınamadı',
      type: '/problems/mobile-places-fetch-failed',
      instance: '/api/mobile/places',
    });
  }
};

// POST: Sync places updated since lastSync
export const POST: APIRoute = async ({ request }) => {
  try {
    const { lastSync, categories } = (await request.json()) as SyncRequestBody;

    const since = lastSync ? new Date(lastSync) : new Date(0);

    let where = `WHERE p.status = 'active' AND p.updated_at > $1`;
    const params: Array<Date | string[]> = [since];
    let idx = 2;

    if (categories && Array.isArray(categories) && categories.length > 0) {
      where += ` AND (p.category = ANY($${idx}) OR c.slug = ANY($${idx}))`;
      params.push(categories);
      idx++;
    }

    const result = await query<SyncPlaceRow>(
      `SELECT p.id, p.slug, p.name, p.rating, p.review_count, p.updated_at
       FROM places p
       LEFT JOIN categories c ON c.id = p.category_id
       ${where}
       ORDER BY p.updated_at DESC
       LIMIT 200`,
      params
    );

    const updates = result.rows.map((p) => ({
      id: p.id,
      action: 'update',
      data: {
        rating: toNumber(p.rating) || 0,
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
    return problemJson({
      status: 500,
      title: 'Mobil Mekan Senkronizasyon Hatası',
      detail: 'Senkronizasyon başarısız',
      type: '/problems/mobile-places-sync-failed',
      instance: '/api/mobile/places',
    });
  }
};
