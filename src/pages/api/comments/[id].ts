/**
 * Comment Management API
 * PUT: Update comment
 * DELETE: Delete comment
 */

import type { APIRoute } from 'astro';
import { updateComment, deleteComment } from '../../../lib/comment/comments';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { recordRequest } from '../../../lib/metrics';
import { logger } from '../../../lib/logging';

export const PUT: APIRoute = async ({ request, locals, params }) => {
  const requestId = getRequestId(request);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    const user = locals.user;
    const commentId = params.id;
    if (!user) {
      recordRequest('PUT', `/api/comments/${params.id}`, HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(ErrorCode.UNAUTHORIZED, 'Oturum açmanız gerekiyor', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }
    if (!commentId) {
      recordRequest('PUT', '/api/comments/[id]', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(ErrorCode.VALIDATION_ERROR, 'Yorum ID gereklidir', HttpStatus.BAD_REQUEST, undefined, requestId);
    }

    const body = await request.json();
    const { content } = body;

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      recordRequest('PUT', `/api/comments/${params.id}`, HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
      return apiError(ErrorCode.VALIDATION_ERROR, 'Yorum içeriği gereklidir', HttpStatus.UNPROCESSABLE_ENTITY, undefined, requestId);
    }

    const comment = await updateComment(commentId, user.id, content.trim());

    const duration = Date.now() - startTime;
    recordRequest('PUT', `/api/comments/${params.id}`, HttpStatus.OK, duration);
    logger.logMutation('update', 'comments', commentId, user.id);

    return apiResponse({ success: true, data: comment }, HttpStatus.OK, requestId);
  } catch (error) {
    const duration = Date.now() - startTime;
    const statusCode = error instanceof Error && error.message.includes('Not authorized') ? HttpStatus.FORBIDDEN : HttpStatus.INTERNAL_SERVER_ERROR;
    recordRequest('PUT', `/api/comments/${params.id}`, statusCode, duration);

    if (error instanceof Error && error.message.includes('not found')) {
      return apiError(ErrorCode.NOT_FOUND, 'Yorum bulunamadı', HttpStatus.NOT_FOUND, undefined, requestId);
    }

    if (error instanceof Error && error.message.includes('Not authorized')) {
      return apiError(ErrorCode.FORBIDDEN, 'Bu yorumu düzenlemeye yetkili değilsiniz', HttpStatus.FORBIDDEN, undefined, requestId);
    }

    logger.error('Update comment failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Yorum düzenlenirken hata oluştu', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};

export const DELETE: APIRoute = async ({ request, locals, params }) => {
  const requestId = getRequestId(request);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    const user = locals.user;
    const commentId = params.id;
    if (!user) {
      recordRequest('DELETE', `/api/comments/${params.id}`, HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(ErrorCode.UNAUTHORIZED, 'Oturum açmanız gerekiyor', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }
    if (!commentId) {
      recordRequest('DELETE', '/api/comments/[id]', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(ErrorCode.VALIDATION_ERROR, 'Yorum ID gereklidir', HttpStatus.BAD_REQUEST, undefined, requestId);
    }

    await deleteComment(commentId, user.id);

    const duration = Date.now() - startTime;
    recordRequest('DELETE', `/api/comments/${params.id}`, HttpStatus.OK, duration);
    logger.logMutation('delete', 'comments', commentId, user.id);

    return apiResponse({ success: true, message: 'Yorum silindi' }, HttpStatus.OK, requestId);
  } catch (error) {
    const duration = Date.now() - startTime;
    const statusCode = error instanceof Error && error.message.includes('Not authorized') ? HttpStatus.FORBIDDEN : HttpStatus.INTERNAL_SERVER_ERROR;
    recordRequest('DELETE', `/api/comments/${params.id}`, statusCode, duration);

    if (error instanceof Error && error.message.includes('not found')) {
      return apiError(ErrorCode.NOT_FOUND, 'Yorum bulunamadı', HttpStatus.NOT_FOUND, undefined, requestId);
    }

    if (error instanceof Error && error.message.includes('Not authorized')) {
      return apiError(ErrorCode.FORBIDDEN, 'Bu yorumu silmeye yetkili değilsiniz', HttpStatus.FORBIDDEN, undefined, requestId);
    }

    logger.error('Delete comment failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Yorum silinirken hata oluştu', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
