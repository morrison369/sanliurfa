/**
 * Blog API - Yorum Onayla
 * PATCH /api/blog/comments/[id]/approve
 */

import type { APIRoute } from 'astro';
import { queryOne, update } from '../../../../../lib/postgres';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../../lib/api';
import { recordRequest } from '../../../../../lib/metrics';
import { logger } from '../../../../../lib/logging';

type CommentIdRow = {
  id: string;
};

export const PATCH: APIRoute = async ({ params, request, locals }) => {
  const requestId = getRequestId(request);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.isAdmin) {
      const duration = Date.now() - startTime;
      recordRequest('PATCH', `/api/blog/comments/${params.id}/approve`, HttpStatus.FORBIDDEN, duration);
      return apiError(ErrorCode.UNAUTHORIZED, 'Yönetici yetkisi gereklidir', HttpStatus.FORBIDDEN, undefined, requestId);
    }

    const commentId = params.id;

    if (!commentId) {
      return apiError(ErrorCode.VALIDATION_ERROR, 'Yorum ID gereklidir', HttpStatus.BAD_REQUEST, undefined, requestId);
    }

    const comment = await queryOne<CommentIdRow>('SELECT id FROM blog_comments WHERE id = $1', [commentId]);

    if (!comment) {
      const duration = Date.now() - startTime;
      recordRequest('PATCH', `/api/blog/comments/${params.id}/approve`, HttpStatus.NOT_FOUND, duration);
      return apiError(ErrorCode.NOT_FOUND, 'Yorum bulunamadı', HttpStatus.NOT_FOUND, undefined, requestId);
    }

    await update('blog_comments', { id: commentId }, { status: 'approved' });

    const duration = Date.now() - startTime;
    recordRequest('PATCH', `/api/blog/comments/${params.id}/approve`, HttpStatus.OK, duration);
    logger.logMutation('approve', 'blog_comments', comment.id, locals.user?.id);

    return apiResponse({ success: true, message: 'Yorum onaylandı' }, HttpStatus.OK, requestId);
  } catch (err) {
    const duration = Date.now() - startTime;
    recordRequest('PATCH', `/api/blog/comments/${params.id}/approve`, HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Yorum onaylanamadı', err instanceof Error ? err : new Error(String(err)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Yorum onaylanırken hata oluştu', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
