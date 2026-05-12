// API: Mekan listesi (PostgreSQL + Redis cache)
import type { APIRoute } from 'astro';
import { query, insert, queryRead } from '../../../lib/postgres';
import { getCache, setCache, deleteCachePattern } from '../../../lib/cache';
import { logger } from '../../../lib/logging';
import { resolveContentImage } from '../../../lib/content-images';
import { apiResponse, problemJson, HttpStatus, safeIntParam } from '../../../lib/api';

/**
 * Generate cache key for places list query
 */
function generatePlacesCacheKey(category?: string | null, search?: string | null, limit = 20, offset = 0): string {
  const parts = ['places:list'];
  if (category) parts.push(`cat:${category}`);
  if (search) parts.push(`search:${search.substring(0, 20)}`);
  parts.push(`limit:${limit}`, `offset:${offset}`);
  return parts.join(':');
}

export const GET: APIRoute = async ({ url }) => {
  try {
    const params = url.searchParams;
    const rawCategory = params.get('category');
    const category = rawCategory ? rawCategory.substring(0, 100) : null;
    const rawSearch = params.get('search');
    const search = rawSearch ? rawSearch.substring(0, 200) : null;
    const limit = safeIntParam(params.get('limit'), 20, 1, 1_000_000);
    const offset = safeIntParam(params.get('offset'), 0, 0, 1_000_000);
    const featured = params.get('featured') === 'true';

    // Generate cache key
    const cacheKey = generatePlacesCacheKey(category, search, limit, offset);

    // Try to get from cache (skip cache if featured=true for real-time results)
    if (!featured) {
      const cached = await getCache<{ data: any[]; count: number; pagination: any }>(cacheKey);
      if (cached) {
        return apiResponse(cached, HttpStatus.OK, undefined, { 'X-Cache': 'HIT' });
      }
    }

    // Build query
    // Optimized: SELECT only necessary columns instead of SELECT * (reduces data transfer)
    let sql = `SELECT id, slug, name, category, rating, review_count, is_featured, latitude, longitude,
                      thumbnail_url, avg_rating, status, created_at
               FROM places WHERE status = $1`;
    let countSql = 'SELECT COUNT(*) FROM places WHERE status = $1';
    const values: unknown[] = ['active'];
    let paramIndex = 2;

    if (category) {
      sql += ` AND category = $${paramIndex}`;
      countSql += ` AND category = $${paramIndex}`;
      values.push(category);
      paramIndex++;
    }

    if (featured) {
      sql += ` AND is_featured = true`;
      countSql += ` AND is_featured = true`;
    }

    if (search) {
      const ftsCond = `to_tsvector('turkish', coalesce(name,'') || ' ' || coalesce(description,'')) @@ plainto_tsquery('turkish', $${paramIndex})`;
      sql += ` AND ${ftsCond}`;
      countSql += ` AND ${ftsCond}`;
      values.push(search);
      paramIndex++;
    }

    sql += ` ORDER BY rating DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    values.push(limit, offset);

    // Fetch from database (read replica — SELECT only)
    const [dataResult, countResult] = await Promise.all([
      queryRead(sql, values),
      queryRead(countSql, values.slice(0, paramIndex - 1))
    ]);

    const count = parseInt(countResult.rows[0]?.count || '0', 10);

    const data = dataResult.rows.map((row) => ({
      ...row,
      thumbnail_url: resolveContentImage({
        category: 'places',
        slug: row.slug ?? null,
        explicit: row.thumbnail_url ?? null,
        placeholder: '/images/placeholder-place.jpg',
        thumb: true,
      }),
      image_url: resolveContentImage({
        category: 'places',
        slug: row.slug ?? null,
        explicit: row.thumbnail_url ?? null,
        placeholder: '/images/placeholder-place.jpg',
      }),
    }));

    const responseData = {
      data,
      count,
      pagination: {
        limit,
        offset,
        hasMore: offset + limit < count
      }
    };

    // Cache the result for 5 minutes
    if (!featured) {
      await setCache(cacheKey, responseData, 300);
    }

    return apiResponse(responseData, HttpStatus.OK, undefined, { 'X-Cache': featured ? 'BYPASS' : 'MISS' });
  } catch (err) {
    logger.error('Places fetch error:', err);
    return problemJson({
      status: 500,
      title: 'Mekanlar Alınamadı',
      detail: 'Mekanlar getirilirken bir hata oluştu',
      type: '/problems/places-index-get-failed',
      instance: '/api/places',
    });
  }
};

/**
 * Invalidate all places list caches when a new place is created
 */
async function invalidatePlacesListCache(): Promise<void> {
  // Clear the main list caches by deleting pattern
  // This is a simple approach - in production, you might want to be more selective
  try {
    // Delete common cache keys
    await deleteCachePattern('places:list:*');
  } catch (error) {
    logger.warn('Failed to invalidate places cache:', error instanceof Error ? error : new Error(String(error)));
    // Continue anyway - cache invalidation is not critical
  }
}

// Create new place
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const body = await request.json();

    // Check authentication
    if (!locals.isAdmin && locals.user?.role !== 'admin') {
      return problemJson({
        status: 403,
        title: 'Forbidden',
        detail: 'Admin yetkisi gerekli',
        type: '/problems/places-index-post-unauthorized',
        instance: '/api/places',
      });
    }

    const {
      name, slug, description, short_description, address, phone, email, website,
      price_range, is_featured, is_verified, latitude, longitude, tags, category_id, district_id,
    } = body;

    if (!name || typeof name !== 'string' || name.length > 200) return problemJson({ status: 400, title: 'Geçersiz İstek', detail: 'name zorunlu ve 200 karakterden uzun olamaz', type: '/problems/places-index-post-name-invalid', instance: '/api/places' });
    if (description !== undefined && description !== null && (typeof description !== 'string' || description.length > 5000)) return problemJson({ status: 400, title: 'Geçersiz İstek', detail: 'description 5000 karakterden uzun olamaz', type: '/problems/places-index-post-description-too-long', instance: '/api/places' });
    if (short_description !== undefined && short_description !== null && (typeof short_description !== 'string' || short_description.length > 1000)) return problemJson({ status: 400, title: 'Geçersiz İstek', detail: 'short_description 1000 karakterden uzun olamaz', type: '/problems/places-index-post-short-desc-too-long', instance: '/api/places' });
    if (address !== undefined && address !== null && (typeof address !== 'string' || address.length > 500)) return problemJson({ status: 400, title: 'Geçersiz İstek', detail: 'address 500 karakterden uzun olamaz', type: '/problems/places-index-post-address-too-long', instance: '/api/places' });
    if (phone !== undefined && phone !== null && (typeof phone !== 'string' || phone.length > 30)) return problemJson({ status: 400, title: 'Geçersiz İstek', detail: 'phone 30 karakterden uzun olamaz', type: '/problems/places-index-post-phone-too-long', instance: '/api/places' });
    if (email !== undefined && email !== null && (typeof email !== 'string' || email.length > 254)) return problemJson({ status: 400, title: 'Geçersiz İstek', detail: 'email 254 karakterden uzun olamaz', type: '/problems/places-index-post-email-too-long', instance: '/api/places' });
    if (website !== undefined && website !== null && (typeof website !== 'string' || website.length > 500)) return problemJson({ status: 400, title: 'Geçersiz İstek', detail: 'website 500 karakterden uzun olamaz', type: '/problems/places-index-post-website-too-long', instance: '/api/places' });
    if (slug !== undefined && slug !== null && (typeof slug !== 'string' || slug.length > 200)) return problemJson({ status: 400, title: 'Geçersiz İstek', detail: 'slug 200 karakterden uzun olamaz', type: '/problems/places-index-post-slug-too-long', instance: '/api/places' });
    if (tags && (!Array.isArray(tags) || tags.length > 50)) return problemJson({ status: 400, title: 'Geçersiz İstek', detail: 'tags dizisi geçersiz veya 50 öğe sınırını aşıyor', type: '/problems/places-index-post-tags-invalid', instance: '/api/places' });

    const latNum = latitude != null ? parseFloat(String(latitude)) : null;
    const lonNum = longitude != null ? parseFloat(String(longitude)) : null;
    if (latNum !== null && (!Number.isFinite(latNum) || latNum < -90 || latNum > 90)) return problemJson({ status: 400, title: 'Geçersiz İstek', detail: 'latitude geçersiz', type: '/problems/places-index-post-lat-invalid', instance: '/api/places' });
    if (lonNum !== null && (!Number.isFinite(lonNum) || lonNum < -180 || lonNum > 180)) return problemJson({ status: 400, title: 'Geçersiz İstek', detail: 'longitude geçersiz', type: '/problems/places-index-post-lon-invalid', instance: '/api/places' });

    const data = await insert('places', {
      name, slug, description, short_description, address, phone, email, website,
      price_range, is_featured, is_verified,
      latitude: latNum, longitude: lonNum,
      tags, category_id, district_id,
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    // Invalidate places list cache
    await invalidatePlacesListCache();

    return apiResponse({ data, message: 'Mekan başarıyla eklendi' }, HttpStatus.CREATED);
  } catch (err) {
    logger.error('Place create error:', err);
    return problemJson({
      status: 500,
      title: 'Mekan Eklenemedi',
      detail: 'Mekan eklenirken bir hata oluştu',
      type: '/problems/places-index-post-failed',
      instance: '/api/places',
    });
  }
};
