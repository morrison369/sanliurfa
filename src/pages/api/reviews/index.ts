// API: Yorum işlemleri (PostgreSQL + Redis cache)
import type { APIRoute } from 'astro';
import { query, queryOne, insert, update as updateDb } from '../../../lib/postgres';
import { getCache, setCache, deleteCache } from '../../../lib/cache';
import { logActivity } from '../../../lib/activity';

/**
 * Generate cache key for reviews
 */
function generateReviewsCacheKey(placeId: string, limit = 10, offset = 0): string {
  return `reviews:place:${placeId}:limit:${limit}:offset:${offset}`;
}

// Get reviews for a place
export const GET: APIRoute = async ({ url }) => {
  try {
    const placeId = url.searchParams.get('placeId');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    if (!placeId) {
      return new Response(
        JSON.stringify({ error: 'Mekan ID gereklidir' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Try to get from cache
    const cacheKey = generateReviewsCacheKey(placeId, limit, offset);
    const cached = await getCache<{
      data: any[];
      count: number;
      avgRating: number;
      totalReviews: number;
      pagination: any;
    }>(cacheKey);

    if (cached) {
      return new Response(JSON.stringify(cached), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'X-Cache': 'HIT' }
      });
    }

    const [dataResult, countResult, statsResult] = await Promise.all([
      query(
        `SELECT r.id, r.title, r.content, r.rating, r.helpful_count, r.created_at,
                u.full_name, u.avatar_url
         FROM reviews r
         JOIN users u ON r.user_id = u.id
         WHERE r.place_id = $1
         ORDER BY r.created_at DESC
         LIMIT $2 OFFSET $3`,
        [placeId, limit, offset]
      ),
      query('SELECT COUNT(*) as count FROM reviews WHERE place_id = $1', [placeId]),
      query(
        `SELECT COUNT(*) as total_reviews,
                COALESCE(AVG(rating), 0) as avg_rating
         FROM reviews WHERE place_id = $1`,
        [placeId]
      )
    ]);

    const count = parseInt(countResult.rows[0]?.count || '0');
    const avgRating = parseFloat(statsResult.rows[0]?.avg_rating || '0');
    const totalReviews = parseInt(statsResult.rows[0]?.total_reviews || '0');

    const responseData = {
      data: dataResult.rows,
      count,
      avgRating: Math.round(avgRating * 10) / 10,
      totalReviews,
      pagination: { limit, offset, hasMore: offset + limit < count }
    };

    // Cache for 10 minutes
    await setCache(cacheKey, responseData, 600);

    return new Response(JSON.stringify(responseData), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'X-Cache': 'MISS' }
    });
  } catch (err) {
    console.error('Reviews fetch error:', err);
    return new Response(
      JSON.stringify({ error: 'Yorumlar getirilirken bir hata oluştu' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

/**
 * Invalidate all review caches for a place
 */
async function invalidateReviewsCache(placeId: string): Promise<void> {
  try {
    // Delete all review cache keys for this place
    await deleteCache(`reviews:place:${placeId}:*`);
  } catch (error) {
    console.warn('Failed to invalidate reviews cache:', error);
    // Continue anyway - cache invalidation is not critical
  }
}

// Create review
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const user = locals.user;
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Oturum açmanız gerekiyor' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body = await request.json();
    const { placeId, rating, content, title } = body;

    if (!placeId || !rating || !content) {
      return new Response(
        JSON.stringify({ error: 'Tüm zorunlu alanları doldurun' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (rating < 1 || rating > 5) {
      return new Response(
        JSON.stringify({ error: 'Puan 1-5 arasında olmalıdır' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if user already reviewed this place
    const existing = await queryOne(
      'SELECT id FROM reviews WHERE place_id = $1 AND user_id = $2',
      [placeId, user.id]
    );

    if (existing) {
      return new Response(
        JSON.stringify({ error: 'Bu mekan için zaten yorum yaptınız' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const data = await insert('reviews', {
      place_id: placeId,
      user_id: user.id,
      rating,
      content,
      title,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    // Update place rating
    await updatePlaceRating(placeId);

    // Add points to user (10 puan)
    await query('UPDATE users SET points = COALESCE(points, 0) + 10 WHERE id = $1', [user.id]);

    // Log activity
    const place = await queryOne('SELECT name FROM places WHERE id = $1', [placeId]);
    await logActivity(user.id, 'review_created', 'place', placeId, {
      placeName: place?.name || 'Mekan',
      rating,
      points: 10
    });

    // Invalidate reviews cache for this place
    await invalidateReviewsCache(placeId);

    return new Response(
      JSON.stringify({ data, message: 'Yorumunuz başarıyla eklendi' }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Review create error:', err);
    return new Response(
      JSON.stringify({ error: 'Yorum eklenirken bir hata oluştu' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

async function updatePlaceRating(placeId: string) {
  const result = await query('SELECT rating FROM reviews WHERE place_id = $1', [placeId]);
  const reviews = result.rows;
  
  if (reviews.length > 0) {
    const avgRating = reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length;
    await query(
      'UPDATE places SET rating = $1, review_count = $2 WHERE id = $3',
      [Math.round(avgRating * 10) / 10, reviews.length, placeId]
    );
  }
}
