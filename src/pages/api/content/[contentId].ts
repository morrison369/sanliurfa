/**
 * API: Content Item
 * GET - Get content details
 * PUT - Update content
 * DELETE - Delete content
 */
import type { APIRoute } from 'astro';
import { queryOne, update } from '../../../lib/postgres';
import { getContentById, updateContent } from '../../../lib/content-management';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { recordRequest } from '../../../lib/metrics';
import { logger } from '../../../lib/logging';
import { deleteCache } from '../../../lib/cache';

export const GET: APIRoute = async ({ request, params, locals }) => {
  const requestId = getRequestId(request as any);
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
  const requestId = getRequestId(request as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.id) {
      recordRequest('PUT', `/api/content/${params.contentId}`, HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(ErrorCode.UNAUTHORIZED, 'Authentication required', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const { contentId } = params;
    const body = await request.json();

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
  const requestId = getRequestId(request as any);
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
    await deleteCache(`sanliurfa:content:${contentId}`);

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
