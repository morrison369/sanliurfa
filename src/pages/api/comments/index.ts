/**
 * Comments API
 * GET: Retrieve comments for a target (review/place)
 * POST: Create new comment
 */

import type { APIRoute } from 'astro';
import { getComments, createComment } from '../../../lib/comment/comments';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId, safeIntParam } from '../../../lib/api';
import { validateWithSchema, type ValidationSchema } from '../../../lib/validation';
import { recordRequest } from '../../../lib/metrics';
import { logger } from '../../../lib/logging';

export const GET: APIRoute = async ({ request, url, locals }) => {
  const requestId = getRequestId(request);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    // Get query parameters
    const targetType = url.searchParams.get('targetType');
    const targetId = url.searchParams.get('targetId');
    const limit = safeIntParam(url.searchParams.get('limit'), 50, 1, 100);

    // Validate parameters
    const VALID_TARGET_TYPES = new Set(['place', 'review', 'blog', 'event', 'recipe']);
    if (!targetType || !targetId) {
      recordRequest('GET', '/api/comments', HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'targetType ve targetId parametreleri gereklidir',
        HttpStatus.UNPROCESSABLE_ENTITY,
        undefined,
        requestId
      );
    }

    if (!VALID_TARGET_TYPES.has(targetType)) {
      recordRequest('GET', '/api/comments', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(ErrorCode.VALIDATION_ERROR, 'Geçersiz hedef tipi', HttpStatus.BAD_REQUEST, undefined, requestId);
    }

    // Get comments
    const comments = await getComments(targetType, targetId, locals.user?.id, limit);

    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/comments', HttpStatus.OK, duration);

    return apiResponse(
      {
        success: true,
        data: comments,
        count: comments.length
      },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/comments', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Get comments failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Yorumlar alınırken bir hata oluştu',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};

export const POST: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId(request);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    const user = locals.user;

    if (!user) {
      recordRequest('POST', '/api/comments', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(
        ErrorCode.UNAUTHORIZED,
        'Oturum açmanız gerekiyor',
        HttpStatus.UNAUTHORIZED,
        undefined,
        requestId
      );
    }

    const body = await request.json();

    const commentSchema: ValidationSchema = {
      targetType: { type: 'string' as const, required: true, maxLength: 50 },
      targetId: { type: 'string' as const, required: true, maxLength: 100 },
      content: { type: 'string' as const, required: true, minLength: 1, maxLength: 5000, sanitize: true },
      parentCommentId: { type: 'string' as const, required: false, maxLength: 100 },
    };
    const validation = validateWithSchema(body, commentSchema);
    if (!validation.valid) {
      recordRequest('POST', '/api/comments', HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        validation.errors?.[0] || 'Geçersiz yorum verisi',
        HttpStatus.UNPROCESSABLE_ENTITY,
        undefined,
        requestId
      );
    }
    const { targetType, targetId, content, parentCommentId } = body;

    // Create comment
    const comment = await createComment(user.id, targetType, targetId, content, parentCommentId);

    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/comments', HttpStatus.CREATED, duration);
    logger.logMutation('create', 'comments', comment.id, user.id);

    return apiResponse(
      {
        success: true,
        data: comment
      },
      HttpStatus.CREATED,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/comments', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Create comment failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Yorum yazarken bir hata oluştu',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
