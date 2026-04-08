/**
 * Blog API - Yorum Reddet
 * PATCH /api/blog/comments/[id]/reject
 */

import type { APIRoute } from 'astro';
import { queryOne, update } from '../../../../../lib/postgres';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../../lib/api';
import { recordRequest } from '../../../../../lib/metrics';
import { logger } from '../../../../../lib/logging';

export const PATCH: APIRoute = async ({ params, request, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.isAdmin) {
      const duration = Date.now() - startTime;
      recordRequest('PATCH', `/api/blog/comments/${params.id}/reject`, HttpStatus.FORBIDDEN, duration);
      return apiError(ErrorCode.UNAUTHORIZED, 'Yönetici yetkisi gereklidir', HttpStatus.FORBIDDEN, undefined, requestId);
    }

    const commentId = parseInt(params.id as string);
    const comment = await queryOne('SELECT id FROM blog_comments WHERE id = $1', [commentId]);

    if (!comment) {
      const duration = Date.now() - startTime;
      recordRequest('PATCH', `/api/blog/comments/${params.id}/reject`, HttpStatus.NOT_FOUND, duration);
      return apiError(ErrorCode.NOT_FOUND, 'Yorum bulunamadı', HttpStatus.NOT_FOUND, undefined, requestId);
    }

    await update('blog_comments', { id: commentId }, { status: 'rejected' });

    const duration = Date.now() - startTime;
    recordRequest('PATCH', `/api/blog/comments/${params.id}/reject`, HttpStatus.OK, duration);
    logger.logMutation('reject', 'blog_comments', commentId, locals.user?.id, { duration });

    return apiResponse({ success: true, message: 'Yorum reddedildi' }, HttpStatus.OK, requestId);
  } catch (err) {
    const duration = Date.now() - startTime;
    recordRequest('PATCH', `/api/blog/comments/${params.id}/reject`, HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Yorum reddedilemedi', err instanceof Error ? err : new Error(String(err)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Yorum reddedilirken hata oluştu', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
