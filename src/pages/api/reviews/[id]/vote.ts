/**
 * Review Vote API
 * POST: Vote on a review (helpful/unhelpful)
 */

import type { APIRoute } from 'astro';
import { query, queryOne } from '../../../../lib/postgres';
import { deleteCache } from '../../../../lib/cache';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../lib/api';
import { recordRequest } from '../../../../lib/metrics';
import { logger } from '../../../../lib/logging';

export const POST: APIRoute = async ({ request, locals, params }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    const user = locals.user;
    if (!user) {
      recordRequest('POST', `/api/reviews/${params.id}/vote`, HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(
        ErrorCode.AUTH_REQUIRED,
        'Oturum açmanız gerekiyor',
        HttpStatus.UNAUTHORIZED,
        undefined,
        requestId
      );
    }

    const body = await request.json();
    const { voteType } = body;

    if (!voteType || !['helpful', 'unhelpful'].includes(voteType)) {
      recordRequest('POST', `/api/reviews/${params.id}/vote`, HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Geçerli bir oy türü belirtin (helpful veya unhelpful)',
        HttpStatus.UNPROCESSABLE_ENTITY,
        undefined,
        requestId
      );
    }

    // Get review to find place_id for cache clearing
    const review = await queryOne('SELECT place_id FROM reviews WHERE id = $1', [params.id]);
    if (!review) {
      recordRequest('POST', `/api/reviews/${params.id}/vote`, HttpStatus.NOT_FOUND, Date.now() - startTime);
      return apiError(
        ErrorCode.NOT_FOUND,
        'İnceleme bulunamadı',
        HttpStatus.NOT_FOUND,
        undefined,
        requestId
      );
    }

    // Try to insert vote
    try {
      await query(
        `INSERT INTO review_votes (review_id, user_id, vote_type)
         VALUES ($1, $2, $3)`,
        [params.id, user.id, voteType]
      );

      // Update helpful/unhelpful count
      const columnName = voteType === 'helpful' ? 'helpful_count' : 'unhelpful_count';
      await query(
        `UPDATE reviews SET ${columnName} = ${columnName} + 1 WHERE id = $1`,
        [params.id]
      );

      // Clear cache
      await deleteCache(`sanliurfa:rating-dist:${review.place_id}`);

      const duration = Date.now() - startTime;
      recordRequest('POST', `/api/reviews/${params.id}/vote`, HttpStatus.OK, duration);
      logger.logMutation('create', 'review_votes', `${params.id}-${user.id}`, user.id, { voteType });

      return apiResponse(
        {
          success: true,
          message: `İnceleme ${voteType === 'helpful' ? 'faydalı' : 'faydasız'} olarak işaretlendi`
        },
        HttpStatus.OK,
        requestId
      );
    } catch (err: any) {
      // Duplicate vote
      if (err.message?.includes('duplicate')) {
        recordRequest('POST', `/api/reviews/${params.id}/vote`, HttpStatus.CONFLICT, Date.now() - startTime);
        return apiError(
          ErrorCode.CONFLICT,
          'Bu inceleme üzerinde zaten bir oy kullandınız',
          HttpStatus.CONFLICT,
          undefined,
          requestId
        );
      }
      throw err;
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('POST', `/api/reviews/${params.id}/vote`, HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Vote on review failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Oy verirken bir hata oluştu',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
