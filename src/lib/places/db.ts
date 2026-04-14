/**
 * Places Database Module
 * PostgreSQL based place management
 */

import { query, queryOne } from '../postgres';
import { getCache, setCache, deleteCache } from '../cache';

export interface Place {
  id: string;
  slug: string;
  name: string;
  category_id: string;
  category_slug: string;
  category_name: string;
  short_description: string;
  description?: string;
  meta_description?: string;
  address?: string;
  phone?: string;
  website?: string;
  email?: string;
  latitude?: number;
  longitude?: number;
  thumbnail?: string;
  images?: string[];
  rating: number;
  review_count: number;
  price_range?: string;
  price_min?: number;
  price_max?: number;
  features?: string[];
  opening_hours?: Record<string, string>;
  is_verified: boolean;
  is_featured: boolean;
  status: 'pending' | 'approved' | 'rejected';
  view_count: number;
  created_at: string;
  updated_at: string;
}

export interface PlaceFilters {
  category?: string;
  status?: string;
  featured?: boolean;
  verified?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'popular' | 'rating' | 'newest' | 'name';
}

// Cache keys
const CACHE_KEYS = {
  places: 'places:list',
  place: (slug: string) => `places:${slug}`,
  featured: 'places:featured',
  categories: 'places:categories',
};

/**
 * Get places with filters
 */
export async function getPlaces(filters: PlaceFilters = {}): Promise<{ places: Place[]; total: number }> {
  const cacheKey = `${CACHE_KEYS.places}:${JSON.stringify(filters)}`;
  const cached = await getCache<{ places: Place[]; total: number }>(cacheKey);
  if (cached) return cached;

  const {
    category,
    status = 'approved',
    featured,
    verified,
    search,
    limit = 20,
    offset = 0,
    sortBy = 'popular',
  } = filters;

  let whereClause = 'WHERE 1=1';
  const params: any[] = [];

  if (status) {
    params.push(status);
    whereClause += ` AND p.status = $${params.length}`;
  }

  if (category) {
    params.push(category);
    whereClause += ` AND c.slug = $${params.length}`;
  }

  if (featured !== undefined) {
    params.push(featured);
    whereClause += ` AND p.is_featured = $${params.length}`;
  }

  if (verified !== undefined) {
    params.push(verified);
    whereClause += ` AND p.is_verified = $${params.length}`;
  }

  if (search) {
    params.push(`%${search}%`);
    params.push(`%${search}%`);
    whereClause += ` AND (p.name ILIKE $${params.length - 1} OR p.short_description ILIKE $${params.length})`;
  }

  // Get total count
  const countResult = await queryOne<{ count: number }>(
    `SELECT COUNT(*)::int as count 
     FROM places p
     LEFT JOIN place_categories c ON c.id = p.category_id
     ${whereClause}`,
    params
  );

  // Build sort
  let orderBy = 'p.view_count DESC';
  switch (sortBy) {
    case 'rating':
      orderBy = 'p.rating DESC, p.review_count DESC';
      break;
    case 'newest':
      orderBy = 'p.created_at DESC';
      break;
    case 'name':
      orderBy = 'p.name ASC';
      break;
  }

  params.push(limit);
  params.push(offset);

  const result = await query<Place>(
    `SELECT 
      p.*,
      c.slug as category_slug,
      c.name as category_name
    FROM places p
    LEFT JOIN place_categories c ON c.id = p.category_id
    ${whereClause}
    ORDER BY ${orderBy}
    LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  const response = { places: result.rows, total: countResult?.count || 0 };
  await setCache(cacheKey, response, 300);
  return response;
}

/**
 * Get single place by slug
 */
export async function getPlaceBySlug(slug: string): Promise<Place | null> {
  const cacheKey = CACHE_KEYS.place(slug);
  const cached = await getCache<Place>(cacheKey);
  if (cached) {
    incrementViewCount(cached.id);
    return cached;
  }

  const result = await queryOne<Place>(
    `SELECT 
      p.*,
      c.slug as category_slug,
      c.name as category_name
    FROM places p
    LEFT JOIN place_categories c ON c.id = p.category_id
    WHERE p.slug = $1`,
    [slug]
  );

  if (result) {
    await setCache(cacheKey, result, 600);
    incrementViewCount(result.id);
  }

  return result;
}

/**
 * Search places
 */
export async function searchPlaces(query_str: string): Promise<{ places: Place[] }> {
  const result = await query<Place>(
    `SELECT 
      p.*,
      c.slug as category_slug,
      c.name as category_name
    FROM places p
    LEFT JOIN place_categories c ON c.id = p.category_id
    WHERE p.status = 'approved'
      AND (p.name ILIKE $1 OR p.short_description ILIKE $1 OR p.description ILIKE $1)
    ORDER BY p.rating DESC, p.review_count DESC
    LIMIT 20`,
    [`%${query_str}%`]
  );

  return { places: result.rows };
}

/**
 * Get related places
 */
export async function getRelatedPlaces(place: Place, limit = 4): Promise<Place[]> {
  const result = await query<Place>(
    `SELECT 
      p.*,
      c.slug as category_slug,
      c.name as category_name
    FROM places p
    LEFT JOIN place_categories c ON c.id = p.category_id
    WHERE p.status = 'approved'
      AND p.id != $1
      AND (p.category_id = $2 OR p.district = $3)
    ORDER BY p.rating DESC, p.review_count DESC
    LIMIT $4`,
    [place.id, place.category_id, place.district, limit]
  );

  return result.rows;
}

/**
 * Get featured places
 */
export async function getFeaturedPlaces(limit = 8): Promise<Place[]> {
  const cacheKey = `${CACHE_KEYS.featured}:${limit}`;
  const cached = await getCache<Place[]>(cacheKey);
  if (cached) return cached;

  const result = await query<Place>(
    `SELECT 
      p.*,
      c.slug as category_slug,
      c.name as category_name
    FROM places p
    LEFT JOIN place_categories c ON c.id = p.category_id
    WHERE p.status = 'approved' AND p.is_featured = true
    ORDER BY p.view_count DESC
    LIMIT $1`,
    [limit]
  );

  await setCache(cacheKey, result.rows, 300);
  return result.rows;
}

/**
 * Get place reviews
 */
export async function getPlaceReviews(
  placeId: string,
  options: { limit?: number; offset?: number } = {}
): Promise<any[]> {
  const { limit = 10, offset = 0 } = options;

  const result = await query(
    `SELECT 
      r.*,
      u.full_name as user_name,
      u.avatar_url as user_avatar
    FROM place_reviews r
    LEFT JOIN users u ON u.id = r.user_id
    WHERE r.place_id = $1 AND r.status = 'approved'
    ORDER BY r.created_at DESC
    LIMIT $2 OFFSET $3`,
    [placeId, limit, offset]
  );

  return result.rows;
}

/**
 * Get place rating breakdown
 */
export async function getPlaceRatingBreakdown(placeId: string): Promise<{
  average: number;
  total: number;
  distribution: Record<number, number>;
} | null> {
  const result = await queryOne<{
    avg_rating: number;
    total: number;
    five: number;
    four: number;
    three: number;
    two: number;
    one: number;
  }>(
    `SELECT 
      AVG(rating)::numeric(3,2) as avg_rating,
      COUNT(*)::int as total,
      COUNT(*) FILTER (WHERE rating = 5)::int as five,
      COUNT(*) FILTER (WHERE rating = 4)::int as four,
      COUNT(*) FILTER (WHERE rating = 3)::int as three,
      COUNT(*) FILTER (WHERE rating = 2)::int as two,
      COUNT(*) FILTER (WHERE rating = 1)::int as one
    FROM place_reviews
    WHERE place_id = $1 AND status = 'approved'`,
    [placeId]
  );

  if (!result) return null;

  return {
    average: result.avg_rating,
    total: result.total,
    distribution: {
      5: result.five,
      4: result.four,
      3: result.three,
      2: result.two,
      1: result.one,
    },
  };
}

/**
 * Increment view count
 */
async function incrementViewCount(placeId: string): Promise<void> {
  await query(
    'UPDATE places SET view_count = view_count + 1 WHERE id = $1',
    [placeId]
  );
}

// Admin functions
export async function createPlace(data: Partial<Place>): Promise<Place> {
  const result = await queryOne<Place>(
    `INSERT INTO places (
      slug, name, category_id, short_description, description,
      address, phone, website, email, latitude, longitude,
      price_range, features, status, is_featured
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    RETURNING *`,
    [
      data.slug,
      data.name,
      data.category_id,
      data.short_description,
      data.description,
      data.address,
      data.phone,
      data.website,
      data.email,
      data.latitude,
      data.longitude,
      data.price_range,
      data.features,
      data.status || 'pending',
      data.is_featured || false,
    ]
  );

  await deleteCache(CACHE_KEYS.places);
  return result!;
}

export async function updatePlace(id: string, data: Partial<Place>): Promise<Place> {
  const updates: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined && key !== 'id') {
      updates.push(`${key} = $${paramIndex++}`);
      values.push(value);
    }
  });

  updates.push('updated_at = NOW()');
  values.push(id);

  const result = await queryOne<Place>(
    `UPDATE places SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  );

  await deleteCache(CACHE_KEYS.places);
  if (result?.slug) {
    await deleteCache(CACHE_KEYS.place(result.slug));
  }

  return result!;
}

export async function deletePlace(id: string): Promise<boolean> {
  const result = await query('DELETE FROM places WHERE id = $1', [id]);
  await deleteCache(CACHE_KEYS.places);
  return (result.rowCount || 0) > 0;
}
