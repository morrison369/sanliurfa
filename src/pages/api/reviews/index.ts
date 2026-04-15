/**
 * GET /api/reviews  — Get reviews for a place or user
 * POST /api/reviews — Create / update / delete / vote on reviews
 */

import type { APIRoute } from 'astro';
import { query } from '../../../lib/postgres';
import { requireAuth } from '../../../lib/auth';
import { logger } from '../../../lib/logging';

// ─── GET ──────────────────────────────────────────────────────────────────────

export const GET: APIRoute = async ({ url }) => {
  try {
    const placeId = url.searchParams.get('placeId');
    const userId  = url.searchParams.get('userId');
    const stats   = url.searchParams.get('stats');
    const sortBy  = url.searchParams.get('sortBy') || 'newest';
    const ratingFilter = url.searchParams.get('rating');
    const page    = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
    const limit   = Math.min(50, parseInt(url.searchParams.get('limit') || '20'));
    const offset  = (page - 1) * limit;

    // Rating breakdown stats for a place
    if (stats && placeId) {
      const result = await query(
        `SELECT
           rating,
           COUNT(*) AS count
         FROM reviews
         WHERE place_id = $1 AND status != 'deleted'
         GROUP BY rating
         ORDER BY rating DESC`,
        [placeId]
      );

      const breakdown: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      let total = 0;
      let sum   = 0;
      for (const row of result.rows) {
        const r = parseInt(row.rating);
        const c = parseInt(row.count);
        breakdown[r] = c;
        total += c;
        sum   += r * c;
      }

      return new Response(
        JSON.stringify({
          breakdown,
          total,
          average: total > 0 ? (sum / total).toFixed(1) : '0',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Build ORDER BY
    const orderMap: Record<string, string> = {
      newest:    'r.created_at DESC',
      oldest:    'r.created_at ASC',
      highest:   'r.rating DESC',
      lowest:    'r.rating ASC',
      helpful:   'r.helpful_count DESC',
    };
    const orderBy = orderMap[sortBy] || 'r.created_at DESC';

    const params: any[] = [];
    let where = `WHERE r.status != 'deleted'`;
    let idx = 1;

    if (placeId) {
      where += ` AND r.place_id = $${idx++}`;
      params.push(placeId);
    } else if (userId) {
      where += ` AND r.user_id = $${idx++}`;
      params.push(userId);
    }

    if (ratingFilter) {
      where += ` AND r.rating = $${idx++}`;
      params.push(parseInt(ratingFilter));
    }

    const countResult = await query(
      `SELECT COUNT(*) FROM reviews r ${where}`,
      params
    );
    const total = parseInt(countResult.rows[0].count || '0');

    const dataResult = await query(
      `SELECT
         r.id, r.place_id, r.user_id, r.title, r.content, r.rating,
         r.helpful_count, r.unhelpful_count, r.images, r.visit_type,
         r.is_verified, r.status, r.created_at, r.updated_at,
         u.full_name AS user_name, u.avatar_url AS user_avatar
       FROM reviews r
       JOIN users u ON u.id = r.user_id
       ${where}
       ORDER BY ${orderBy}
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, limit, offset]
    );

    return new Response(
      JSON.stringify({
        reviews: dataResult.rows,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    logger.error('Reviews GET error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to get reviews' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// ─── POST ─────────────────────────────────────────────────────────────────────

export const POST: APIRoute = async ({ request }) => {
  try {
    const auth = await requireAuth(request);
    if (!auth.user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });

    const body = await request.json();
    const { action = 'create', reviewId, placeId, rating, title, content, images = [], visitType } = body;

    // CREATE
    if (action === 'create') {
      if (!placeId || !rating || !content) {
        return new Response(
          JSON.stringify({ error: 'placeId, rating, content gereklidir' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Prevent duplicate reviews
      const existing = await query(
        `SELECT id FROM reviews WHERE place_id = $1 AND user_id = $2 AND status != 'deleted'`,
        [placeId, auth.user.id]
      );
      if (existing.rows.length > 0) {
        return new Response(
          JSON.stringify({ error: 'Bu mekan için zaten yorum yazdınız' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const result = await query(
        `INSERT INTO reviews (place_id, user_id, rating, title, content, images, visit_type, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')
         RETURNING *`,
        [placeId, auth.user.id, rating, title || null, content, images, visitType || null]
      );

      // Update place rating
      await query(
        `UPDATE places SET
           rating = (SELECT AVG(rating) FROM reviews WHERE place_id = $1 AND status != 'deleted'),
           review_count = (SELECT COUNT(*) FROM reviews WHERE place_id = $1 AND status != 'deleted'),
           updated_at = NOW()
         WHERE id = $1`,
        [placeId]
      );

      return new Response(
        JSON.stringify({ success: true, review: result.rows[0] }),
        { status: 201, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // UPDATE
    if (action === 'update' && reviewId) {
      const result = await query(
        `UPDATE reviews
         SET rating = COALESCE($1, rating),
             title = COALESCE($2, title),
             content = COALESCE($3, content),
             images = COALESCE($4, images),
             updated_at = NOW()
         WHERE id = $5 AND user_id = $6 AND status != 'deleted'
         RETURNING *`,
        [rating, title, content, images?.length ? images : null, reviewId, auth.user.id]
      );
      if (!result.rows[0]) {
        return new Response(JSON.stringify({ error: 'Yorum bulunamadı' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
      }

      const pid = result.rows[0].place_id;
      await query(
        `UPDATE places SET rating = (SELECT AVG(rating) FROM reviews WHERE place_id = $1 AND status != 'deleted'), updated_at = NOW() WHERE id = $1`,
        [pid]
      );

      return new Response(
        JSON.stringify({ success: true, review: result.rows[0] }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // DELETE (soft)
    if (action === 'delete' && reviewId) {
      await query(
        `UPDATE reviews SET status = 'deleted', updated_at = NOW() WHERE id = $1 AND user_id = $2`,
        [reviewId, auth.user.id]
      );
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // HELPFUL VOTE
    if ((action === 'helpful' || action === 'unhelpful') && reviewId) {
      const voteType = action;
      // Upsert vote
      await query(
        `INSERT INTO review_votes (review_id, user_id, vote_type)
         VALUES ($1, $2, $3)
         ON CONFLICT (review_id, user_id) DO UPDATE SET vote_type = $3`,
        [reviewId, auth.user.id, voteType]
      );
      // Refresh counts
      await query(
        `UPDATE reviews SET
           helpful_count   = (SELECT COUNT(*) FROM review_votes WHERE review_id = $1 AND vote_type = 'helpful'),
           unhelpful_count = (SELECT COUNT(*) FROM review_votes WHERE review_id = $1 AND vote_type = 'unhelpful')
         WHERE id = $1`,
        [reviewId]
      );
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: 'Geçersiz action' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    logger.error('Reviews POST error:', error);
    return new Response(JSON.stringify({ error: 'Yorum işlemi başarısız' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
