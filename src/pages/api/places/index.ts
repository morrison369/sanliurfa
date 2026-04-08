// API: Mekan listesi (PostgreSQL + Redis cache)
import type { APIRoute } from 'astro';
import { query, insert } from '../../../lib/postgres';
import { getCache, setCache, deleteCache } from '../../../lib/cache';

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
    const category = params.get('category');
    const search = params.get('search');
    const limit = parseInt(params.get('limit') || '20');
    const offset = parseInt(params.get('offset') || '0');
    const featured = params.get('featured') === 'true';

    // Generate cache key
    const cacheKey = generatePlacesCacheKey(category, search, limit, offset);

    // Try to get from cache (skip cache if featured=true for real-time results)
    if (!featured) {
      const cached = await getCache<{ data: any[]; count: number; pagination: any }>(cacheKey);
      if (cached) {
        return new Response(JSON.stringify(cached), {
          status: 200,
          headers: { 'Content-Type': 'application/json', 'X-Cache': 'HIT' }
        });
      }
    }

    // Build query
    // Optimized: SELECT only necessary columns instead of SELECT * (reduces data transfer)
    let sql = `SELECT id, name, category, rating, review_count, is_featured, latitude, longitude,
                      thumbnail_url, avg_rating, status, created_at
               FROM places WHERE status = $1`;
    let countSql = 'SELECT COUNT(*) FROM places WHERE status = $1';
    const values: any[] = ['active'];
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
      sql += ` AND (name ILIKE $${paramIndex} OR description ILIKE $${paramIndex} OR tags::text ILIKE $${paramIndex})`;
      countSql += ` AND (name ILIKE $${paramIndex} OR description ILIKE $${paramIndex} OR tags::text ILIKE $${paramIndex})`;
      values.push(`%${search}%`);
      paramIndex++;
    }

    sql += ` ORDER BY rating DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    values.push(limit, offset);

    // Fetch from database
    const [dataResult, countResult] = await Promise.all([
      query(sql, values),
      query(countSql, values.slice(0, paramIndex - 1))
    ]);

    const count = parseInt(countResult.rows[0]?.count || '0');

    const responseData = {
      data: dataResult.rows,
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

    return new Response(JSON.stringify(responseData), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'X-Cache': 'MISS' }
    });
  } catch (err) {
    console.error('Places fetch error:', err);
    return new Response(
      JSON.stringify({ error: 'Mekanlar getirilirken bir hata oluştu' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
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
    const commonCaches = [
      'places:list:*',
      'places:list:cat:*',
      'places:list:search:*'
    ];

    for (const pattern of commonCaches) {
      await deleteCache(pattern);
    }
  } catch (error) {
    console.warn('Failed to invalidate places cache:', error);
    // Continue anyway - cache invalidation is not critical
  }
}

// Create new place
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const body = await request.json();

    // Check authentication
    if (!locals.isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const data = await insert('places', {
      ...body,
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    // Invalidate places list cache
    await invalidatePlacesListCache();

    return new Response(
      JSON.stringify({ data, message: 'Mekan başarıyla eklendi' }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Place create error:', err);
    return new Response(
      JSON.stringify({ error: 'Mekan eklenirken bir hata oluştu' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
