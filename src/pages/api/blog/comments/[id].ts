/**
 * Blog API - Yorum Moderasyonu
 * PATCH /api/blog/comments/[id]/approve - Yorumu onayla (admin)
 * PATCH /api/blog/comments/[id]/reject - Yorumu reddet (admin)
 * DELETE /api/blog/comments/[id] - Yorumu sil (admin)
 */

import type { APIRoute } from 'astro';
import { queryOne, update, queryMany } from '../../../../lib/postgres';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../lib/api';
import { recordRequest } from '../../../../lib/metrics';
import { logger } from '../../../../lib/logging';

// Yorumu sil
export const DELETE: APIRoute = async ({ params, request, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    // Yetki kontrolü
    if (!locals.isAdmin) {
      const duration = Date.now() - startTime;
      recordRequest('DELETE', `/api/blog/comments/${params.id}`, HttpStatus.FORBIDDEN, duration);
      return apiError(
        ErrorCode.UNAUTHORIZED,
        'Bu işlem için yönetici yetkisi gereklidir',
        HttpStatus.FORBIDDEN,
        undefined,
        requestId
      );
    }

    const commentId = parseInt(params.id as string);

    // Yorumu getir
    const comment = await queryOne(
      'SELECT id FROM blog_comments WHERE id = $1',
      [commentId]
    );

    if (!comment) {
      const duration = Date.now() - startTime;
      recordRequest('DELETE', `/api/blog/comments/${params.id}`, HttpStatus.NOT_FOUND, duration);
      return apiError(
        ErrorCode.NOT_FOUND,
        'Yorum bulunamadı',
        HttpStatus.NOT_FOUND,
        undefined,
        requestId
      );
    }

    // Yorumu sil
    await queryMany(
      'DELETE FROM blog_comments WHERE id = $1 OR parent_comment_id = $1',
      [commentId]
    );

    const duration = Date.now() - startTime;
    recordRequest('DELETE', `/api/blog/comments/${params.id}`, HttpStatus.OK, duration);
    logger.logMutation('delete', 'blog_comments', commentId, locals.user?.id, { duration });

    return apiResponse(
      {
        success: true,
        message: 'Yorum silindi'
      },
      HttpStatus.OK,
      requestId
    );
  } catch (err) {
    const duration = Date.now() - startTime;
    recordRequest('DELETE', `/api/blog/comments/${params.id}`, HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Yorum silinemedi', err instanceof Error ? err : new Error(String(err)));

    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Yorum silinirken hata oluştu',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
