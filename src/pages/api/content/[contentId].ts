/**
 * API: Content Item
 * GET - Get content details
 * PUT - Update content
 * DELETE - Delete content
 */
import type { APIRoute } from 'astro';
import { queryOne, update } from '../../../lib/postgres';
import { getContentById, updateContent } from '../../../lib/content/content-management';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { recordRequest } from '../../../lib/metrics';
import { logger } from '../../../lib/logging';
import { deleteCache } from '../../../lib/cache';

export const GET: APIRoute = async ({ request, params, locals }) => {
  const requestId = getRequestId(request);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    const { contentId } = params;
    const content = await getContentById(contentId as string);

    if (!content) {
      recordRequest('GET', `/api/content/${contentId}`, HttpStatus.NOT_FOUND, Date.now() - startTime);
      return apiError(ErrorCode.NOT_FOUND, 'Content not found', HttpStatus.NOT_FOUND, undefined, requestId);
    }

    // Check visibility
    if (content.visibility === 'private' && content.author_id !== locals.user?.id && !locals.isAdmin) {
      recordRequest('GET', `/api/content/${contentId}`, HttpStatus.FORBIDDEN, Date.now() - startTime);
      return apiError(ErrorCode.FORBIDDEN, 'Access denied', HttpStatus.FORBIDDEN, undefined, requestId);
    }

    const duration = Date.now() - startTime;
    recordRequest('GET', `/api/content/${contentId}`, HttpStatus.OK, duration);

    return apiResponse(
      { success: true, data: content },
      HttpStatus.OK,
      requestId
    );
  } catch (err) {
    const duration = Date.now() - startTime;
    recordRequest('GET', `/api/content/${params.contentId}`, HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Failed to get content', err instanceof Error ? err : new Error(String(err)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Internal server error', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};

export const PUT: APIRoute = async ({ request, params, locals }) => {
  const requestId = getRequestId(request);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.id) {
      recordRequest('PUT', `/api/content/${params.contentId}`, HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(ErrorCode.UNAUTHORIZED, 'Authentication required', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const { contentId } = params;
    const body = await request.json();

    if (body.title !== undefined) {
      if (typeof body.title !== 'string' || body.title.length < 3 || body.title.length > 500)  {
        recordRequest('PUT', `/api/content/${contentId}`, HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
        return apiError(ErrorCode.VALIDATION_ERROR, 'Başlık 3-500 karakter arasında olmalıdır', HttpStatus.UNPROCESSABLE_ENTITY, undefined, requestId);
      }
    }
    if (body.description !== undefined && body.description !== null && (typeof body.description !== 'string' || body.description.length > 5000)) {
      recordRequest('PUT', `/api/content/${contentId}`, HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
      return apiError(ErrorCode.VALIDATION_ERROR, 'Açıklama 5000 karakterden uzun olamaz', HttpStatus.UNPROCESSABLE_ENTITY, undefined, requestId);
    }
    if (body.content !== undefined && body.content !== null && (typeof body.content !== 'string' || body.content.length > 100000)) {
      recordRequest('PUT', `/api/content/${contentId}`, HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
      return apiError(ErrorCode.VALIDATION_ERROR, 'İçerik 100000 karakterden uzun olamaz', HttpStatus.UNPROCESSABLE_ENTITY, undefined, requestId);
    }
    const VALID_CONTENT_TYPES = new Set(['article', 'guide', 'news', 'tip', 'review']);
    if (body.content_type !== undefined && body.content_type !== null && (typeof body.content_type !== 'string' || !VALID_CONTENT_TYPES.has(body.content_type))) {
      recordRequest('PUT', `/api/content/${contentId}`, HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
      return apiError(ErrorCode.VALIDATION_ERROR, 'Geçersiz içerik tipi', HttpStatus.UNPROCESSABLE_ENTITY, undefined, requestId);
    }
    const VALID_VISIBILITY = new Set(['public', 'private', 'unlisted']);
    if (body.visibility !== undefined && body.visibility !== null && (typeof body.visibility !== 'string' || !VALID_VISIBILITY.has(body.visibility))) {
      recordRequest('PUT', `/api/content/${contentId}`, HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
      return apiError(ErrorCode.VALIDATION_ERROR, 'Geçersiz görünürlük değeri', HttpStatus.UNPROCESSABLE_ENTITY, undefined, requestId);
    }

    const success = await updateContent(contentId as string, locals.user.id, body);

    if (!success) {
      recordRequest('PUT', `/api/content/${contentId}`, HttpStatus.FORBIDDEN, Date.now() - startTime);
      return apiError(ErrorCode.FORBIDDEN, 'Access denied', HttpStatus.FORBIDDEN, undefined, requestId);
    }

    const content = await getContentById(contentId as string);
    const duration = Date.now() - startTime;
    recordRequest('PUT', `/api/content/${contentId}`, HttpStatus.OK, duration);

    return apiResponse(
      { success: true, data: content },
      HttpStatus.OK,
      requestId
    );
  } catch (err) {
    const duration = Date.now() - startTime;
    recordRequest('PUT', `/api/content/${params.contentId}`, HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Failed to update content', err instanceof Error ? err : new Error(String(err)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Internal server error', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};

export const DELETE: APIRoute = async ({ request, params, locals }) => {
  const requestId = getRequestId(request);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.id) {
      recordRequest('DELETE', `/api/content/${params.contentId}`, HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(ErrorCode.UNAUTHORIZED, 'Authentication required', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const { contentId } = params;
    const content = await queryOne(
      'SELECT author_id FROM content_items WHERE id = $1',
      [contentId]
    );

    if (!content || content.author_id !== locals.user.id) {
      recordRequest('DELETE', `/api/content/${contentId}`, HttpStatus.FORBIDDEN, Date.now() - startTime);
      return apiError(ErrorCode.FORBIDDEN, 'Access denied', HttpStatus.FORBIDDEN, undefined, requestId);
    }

    await update('content_items', { id: contentId }, { deleted_at: new Date() });
    await deleteCache(`content:${contentId}`);

    const duration = Date.now() - startTime;
    recordRequest('DELETE', `/api/content/${contentId}`, HttpStatus.OK, duration);

    return apiResponse(
      { success: true, message: 'Content deleted' },
      HttpStatus.OK,
      requestId
    );
  } catch (err) {
    const duration = Date.now() - startTime;
    recordRequest('DELETE', `/api/content/${params.contentId}`, HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Failed to delete content', err instanceof Error ? err : new Error(String(err)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Internal server error', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
