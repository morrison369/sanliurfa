/**
 * API: Content Management
 * GET - Get user's content items
 * POST - Create new content
 */
import type { APIRoute } from 'astro';
import { createContent, getUserContent } from '../../../lib/content/content-management';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId, safeIntParam } from '../../../lib/api';
import { recordRequest } from '../../../lib/metrics';
import { logger } from '../../../lib/logging';

export const GET: APIRoute = async ({ request, url, locals }) => {
  const requestId = getRequestId(request);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.id) {
      recordRequest('GET', '/api/content', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(ErrorCode.UNAUTHORIZED, 'Authentication required', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const limit = safeIntParam(url.searchParams.get('limit'), 20, 1, 100);
    const content = await getUserContent(locals.user.id, limit);

    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/content', HttpStatus.OK, duration);

    return apiResponse(
      {
        success: true,
        data: content,
        meta: { count: content.length }
      },
      HttpStatus.OK,
      requestId
    );
  } catch (err) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/content', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Failed to get content', err instanceof Error ? err : new Error(String(err)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Internal server error', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};

export const POST: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId(request);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.id) {
      recordRequest('POST', '/api/content', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(ErrorCode.UNAUTHORIZED, 'Authentication required', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const body = await request.json();

    if (!body.title || typeof body.title !== 'string' || body.title.length < 3) {
      recordRequest('POST', '/api/content', HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
      return apiError(ErrorCode.VALIDATION_ERROR, 'Başlık en az 3 karakter olmalıdır', HttpStatus.UNPROCESSABLE_ENTITY, undefined, requestId);
    }
    if (body.title.length > 500) {
      recordRequest('POST', '/api/content', HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
      return apiError(ErrorCode.VALIDATION_ERROR, 'Başlık 500 karakterden uzun olamaz', HttpStatus.UNPROCESSABLE_ENTITY, undefined, requestId);
    }
    if (body.description !== undefined && body.description !== null && (typeof body.description !== 'string' || body.description.length > 5000)) {
      recordRequest('POST', '/api/content', HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
      return apiError(ErrorCode.VALIDATION_ERROR, 'Açıklama 5000 karakterden uzun olamaz', HttpStatus.UNPROCESSABLE_ENTITY, undefined, requestId);
    }
    if (body.content !== undefined && body.content !== null && (typeof body.content !== 'string' || body.content.length > 100000)) {
      recordRequest('POST', '/api/content', HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
      return apiError(ErrorCode.VALIDATION_ERROR, 'İçerik 100000 karakterden uzun olamaz', HttpStatus.UNPROCESSABLE_ENTITY, undefined, requestId);
    }
    const VALID_CONTENT_TYPES = new Set(['article', 'guide', 'news', 'tip', 'review']);
    if (body.content_type !== undefined && body.content_type !== null && (typeof body.content_type !== 'string' || !VALID_CONTENT_TYPES.has(body.content_type))) {
      recordRequest('POST', '/api/content', HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
      return apiError(ErrorCode.VALIDATION_ERROR, 'Geçersiz içerik tipi', HttpStatus.UNPROCESSABLE_ENTITY, undefined, requestId);
    }
    const VALID_VISIBILITY = new Set(['public', 'private', 'unlisted']);
    if (body.visibility !== undefined && body.visibility !== null && (typeof body.visibility !== 'string' || !VALID_VISIBILITY.has(body.visibility))) {
      recordRequest('POST', '/api/content', HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
      return apiError(ErrorCode.VALIDATION_ERROR, 'Geçersiz görünürlük değeri', HttpStatus.UNPROCESSABLE_ENTITY, undefined, requestId);
    }

    const content = await createContent(locals.user.id, body);

    if (!content) {
      recordRequest('POST', '/api/content', HttpStatus.INTERNAL_SERVER_ERROR, Date.now() - startTime);
      return apiError(ErrorCode.INTERNAL_ERROR, 'Failed to create content', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
    }

    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/content', HttpStatus.CREATED, duration);

    return apiResponse(
      {
        success: true,
        data: content
      },
      HttpStatus.CREATED,
      requestId
    );
  } catch (err) {
    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/content', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Failed to create content', err instanceof Error ? err : new Error(String(err)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Internal server error', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
