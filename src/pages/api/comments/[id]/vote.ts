/**
 * Comment Vote API
 * POST: Vote on a comment (helpful/unhelpful)
 */

import type { APIRoute } from 'astro';
import { voteOnComment } from '../../../../lib/comment';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../lib/api';
import { recordRequest } from '../../../../lib/metrics';
import { logger } from '../../../../lib/logging';

type CommentVoteType = 'helpful' | 'unhelpful';

interface CommentVoteBody {
  voteType?: CommentVoteType;
}

export const POST: APIRoute = async ({ request, locals, params }) => {
  const requestId = getRequestId(request);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    const user = locals.user;
    const { id } = params;
    const route = `/api/comments/${id || 'unknown'}/vote`;

    if (!user) {
      recordRequest('POST', route, HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(
        ErrorCode.UNAUTHORIZED,
        'Oturum açmanız gerekiyor',
        HttpStatus.UNAUTHORIZED,
        undefined,
        requestId
      );
    }

    if (!id) {
      recordRequest('POST', route, HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Yorum ID gereklidir',
        HttpStatus.BAD_REQUEST,
        undefined,
        requestId
      );
    }

    const body = (await request.json()) as CommentVoteBody;
    const { voteType } = body;

    // Validate parameters
    if (!voteType || !['helpful', 'unhelpful'].includes(voteType)) {
      recordRequest('POST', route, HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Geçerli bir oy türü belirtin (helpful veya unhelpful)',
        HttpStatus.UNPROCESSABLE_ENTITY,
        undefined,
        requestId
      );
    }

    // Vote on comment
    await voteOnComment(id, user.id, voteType);

    const duration = Date.now() - startTime;
    recordRequest('POST', route, HttpStatus.OK, duration);
    logger.logMutation('update', 'comments', id, user.id);

    return apiResponse(
      {
        success: true,
        message: `Yorum ${voteType === 'helpful' ? 'faydalı' : 'faydasız'} olarak işaretlendi`
      },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('POST', `/api/comments/${params.id || 'unknown'}/vote`, HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Vote on comment failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Oy verirken bir hata oluştu',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
