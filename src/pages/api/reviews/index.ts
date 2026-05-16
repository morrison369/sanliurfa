/**
 * GET /api/reviews  — Get reviews for a place or user
 * POST /api/reviews — Create / update / delete / vote on reviews
 */

import type { APIRoute } from 'astro';
import { query } from '../../../lib/postgres';
import { requireAuth } from '../../../lib/auth';
import { logger } from '../../../lib/logging';
import { apiResponse, problemJson, HttpStatus, safeErrorDetail, safeIntParam } from '../../../lib/api';
import { deleteCachePattern } from '../../../lib/cache';
import {
  submitPlaceReview,
  type ReviewSubmissionResult,
} from '../../../lib/review/review-submission';

// ─── GET ──────────────────────────────────────────────────────────────────────

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const GET: APIRoute = async ({ url }) => {
  try {
    const rawPlaceId = url.searchParams.get('placeId');
    const rawUserId  = url.searchParams.get('userId');
    // Reject non-UUID IDs early — prevents DB type error and avoids leaking all reviews
    if (rawPlaceId && !UUID_RE.test(rawPlaceId)) {
      return apiResponse({ reviews: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } });
    }
    if (rawUserId && !UUID_RE.test(rawUserId)) {
      return apiResponse({ reviews: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } });
    }
    const placeId = rawPlaceId || null;
    const userId  = rawUserId || null;
    const stats   = url.searchParams.get('stats');
    const VALID_SORT_OPTIONS = new Set(['newest', 'oldest', 'highest', 'lowest', 'helpful']);
    const rawSortBy = url.searchParams.get('sortBy') || 'newest';
    const sortBy = VALID_SORT_OPTIONS.has(rawSortBy) ? rawSortBy : 'newest';
    const ratingFilter = url.searchParams.get('rating');
    const page    = safeIntParam(url.searchParams.get('page'), 1, 1, 1_000_000);
    const limit   = safeIntParam(url.searchParams.get('limit'), 20, 1, 50);
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
        const r = parseInt(row.rating, 10);
        const c = parseInt(row.count, 10);
        if (!Number.isFinite(r) || !Number.isFinite(c)) continue;
        breakdown[r] = c;
        total += c;
        sum   += r * c;
      }

      return apiResponse({
        breakdown,
        total,
        average: total > 0 ? (sum / total).toFixed(1) : '0',
      }, HttpStatus.OK);
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

    const params: unknown[] = [];
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
      const ratingValue = safeIntParam(ratingFilter, 0, 1, 5);
      if (ratingValue >= 1) {
        where += ` AND r.rating = $${idx++}`;
        params.push(ratingValue);
      }
    }

    const [countResult, dataResult] = await Promise.all([
      query(`SELECT COUNT(*) FROM reviews r ${where}`, params),
      query(
        `SELECT
           r.id, r.place_id, r.user_id, r.title, r.content, r.rating,
           r.helpful_count, r.unhelpful_count, r.images, r.visit_type,
           r.is_verified, r.status, r.created_at, r.updated_at,
           r.owner_response, r.owner_responded_at,
           u.full_name AS user_name, u.avatar_url AS user_avatar
         FROM reviews r
         JOIN users u ON u.id = r.user_id
         ${where}
         ORDER BY ${orderBy}
         LIMIT $${idx} OFFSET $${idx + 1}`,
        [...params, limit, offset]
      ),
    ]);
    const total = parseInt(countResult.rows[0].count || '0', 10);

    return apiResponse({
      reviews: dataResult.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    }, HttpStatus.OK);
  } catch (error) {
    logger.error('Reviews GET error:', error);
    return problemJson({
      status: 500,
      title: 'Yorumlar Alınamadı',
      detail: safeErrorDetail(error, 'Yorumlar alınamadı'),
      type: '/problems/reviews-get-failed',
      instance: '/api/reviews',
    });
  }
};

// ─── POST ─────────────────────────────────────────────────────────────────────

export const POST: APIRoute = async ({ request }) => {
  try {
    const auth = await requireAuth(request);
    if (!auth.user) {
      return problemJson({
        status: 401,
        title: 'Unauthorized',
        detail: 'Giriş gerekli',
        type: '/problems/auth-required',
        instance: '/api/reviews',
      });
    }

    const body = await request.json();
    const {
      action = 'create',
      reviewId,
      placeId,
      place_id,
      rating,
      title,
      content,
      images = [],
      visitType,
      visit_date,
    } = body;
    const normalizedPlaceId = placeId || place_id;

    // CREATE
    if (action === 'create') {
      if (!Array.isArray(images) || images.length > 20) {
        return problemJson({ status: 400, title: 'Geçersiz İstek', detail: 'images dizisi en fazla 20 öğe içerebilir', type: '/problems/review-images-invalid', instance: '/api/reviews' });
      }
      let result: ReviewSubmissionResult;
      try {
        result = await submitPlaceReview(
          { id: auth.user.id, email: auth.user.email || null },
          {
            placeId: normalizedPlaceId,
            rating,
            title,
            content,
            images,
            visitType: visitType || visit_date || null,
            awardUserPoints: Boolean(body.awardUserPoints),
            ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
            userAgent: request.headers.get('user-agent') || null,
          },
        );
      } catch (error) {
        return problemJson({
          status: 400,
          title: 'Yorum Gönderilemedi',
          detail: safeErrorDetail(error, 'Yorum gönderilemedi.'),
          type: '/problems/review-create-validation',
          instance: '/api/reviews',
        });
      }

      return apiResponse(result, HttpStatus.CREATED);
    }

    // UPDATE
    if (action === 'update' && reviewId) {
      if (rating !== undefined) {
        const ratingNum = parseFloat(String(rating));
        if (!Number.isFinite(ratingNum) || ratingNum < 1 || ratingNum > 5) {
          return problemJson({ status: 400, title: 'Geçersiz İstek', detail: 'Puan 1-5 arasında olmalıdır', type: '/problems/review-update-rating-invalid', instance: '/api/reviews' });
        }
      }
      if (title !== undefined && title !== null && (typeof title !== 'string' || title.length > 200)) return problemJson({ status: 400, title: 'Geçersiz İstek', detail: 'Başlık 200 karakterden uzun olamaz', type: '/problems/review-update-title-too-long', instance: '/api/reviews' });
      if (content !== undefined && content !== null && (typeof content !== 'string' || content.length > 5000)) return problemJson({ status: 400, title: 'Geçersiz İstek', detail: 'Yorum 5000 karakterden uzun olamaz', type: '/problems/review-update-content-too-long', instance: '/api/reviews' });

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
        return apiResponse({ error: 'Yorum bulunamadı' }, HttpStatus.NOT_FOUND);
      }

      const pid = result.rows[0].place_id;
      await query(
        `UPDATE places SET rating = (SELECT AVG(rating) FROM reviews WHERE place_id = $1 AND status != 'deleted'), updated_at = NOW() WHERE id = $1`,
        [pid]
      );
      await deleteCachePattern('places:detail:*').catch(() => null);

      return apiResponse({ success: true, review: result.rows[0] }, HttpStatus.OK);
    }

    // DELETE (soft)
    if (action === 'delete' && reviewId) {
      const deleted = await query(
        `UPDATE reviews SET status = 'deleted', updated_at = NOW() WHERE id = $1 AND user_id = $2 RETURNING place_id`,
        [reviewId, auth.user.id]
      );
      const placeId = deleted.rows[0]?.place_id;
      if (placeId) {
        await query(
          `UPDATE places SET rating = (SELECT AVG(rating) FROM reviews WHERE place_id = $1 AND status != 'deleted'), updated_at = NOW() WHERE id = $1`,
          [placeId]
        );
        await deleteCachePattern('places:detail:*').catch(() => null);
      }
      return apiResponse({ success: true }, HttpStatus.OK);
    }

    // HELPFUL VOTE
    if ((action === 'helpful' || action === 'unhelpful') && reviewId) {
      const isHelpful = action === 'helpful';
      // Upsert vote
      await query(
        `INSERT INTO review_votes (review_id, user_id, helpful)
         VALUES ($1, $2, $3)
         ON CONFLICT (review_id, user_id) DO UPDATE SET helpful = $3`,
        [reviewId, auth.user.id, isHelpful]
      );
      // Refresh counts
      await query(
        `UPDATE reviews SET
           helpful_count   = (SELECT COUNT(*) FROM review_votes WHERE review_id = $1 AND helpful = true),
           unhelpful_count = (SELECT COUNT(*) FROM review_votes WHERE review_id = $1 AND helpful = false)
         WHERE id = $1`,
        [reviewId]
      );
      return apiResponse({ success: true }, HttpStatus.OK);
    }

    return apiResponse({ error: 'Geçersiz action' }, HttpStatus.BAD_REQUEST);
  } catch (error) {
    logger.error('Reviews POST error:', error);
    return problemJson({
      status: 500,
      title: 'Yorum İşlemi Başarısız',
      detail: safeErrorDetail(error, 'Yorum işlemi başarısız'),
      type: '/problems/reviews-post-failed',
      instance: '/api/reviews',
    });
  }
};
