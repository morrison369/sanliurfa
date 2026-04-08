/**
 * Comments API
 * GET: Retrieve comments for a target (review/place)
 * POST: Create new comment
 */

import type { APIRoute } from 'astro';
import { getComments, createComment } from '../../../lib/comments';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { recordRequest } from '../../../lib/metrics';
import { logger } from '../../../lib/logging';

export const GET: APIRoute = async ({ request, url, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    // Get query parameters
    const targetType = url.searchParams.get('targetType');
    const targetId = url.searchParams.get('targetId');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);

    // Validate parameters
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
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    const user = locals.user;

    if (!user) {
      recordRequest('POST', '/api/comments', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(
        ErrorCode.AUTH_REQUIRED,
        'Oturum açmanız gerekiyor',
        HttpStatus.UNAUTHORIZED,
        undefined,
        requestId
      );
    }

    const body = await request.json();
    const { targetType, targetId, content, parentCommentId } = body;

    // Validate parameters
    if (!targetType || !targetId || !content) {
      recordRequest('POST', '/api/comments', HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Tüm gerekli alanları doldurun',
        HttpStatus.UNPROCESSABLE_ENTITY,
        undefined,
        requestId
      );
    }

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
