/**
 * API: Content Management
 * GET - Get user's content items
 * POST - Create new content
 */
import type { APIRoute } from 'astro';
import { createContent, getUserContent } from '../../../lib/content-management';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { recordRequest } from '../../../lib/metrics';
import { logger } from '../../../lib/logging';

export const GET: APIRoute = async ({ request, url, locals }) => {
  const requestId = getRequestId(request as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.id) {
      recordRequest('GET', '/api/content', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(ErrorCode.UNAUTHORIZED, 'Authentication required', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);
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
  const requestId = getRequestId(request as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.id) {
      recordRequest('POST', '/api/content', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(ErrorCode.UNAUTHORIZED, 'Authentication required', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const body = await request.json();

    if (!body.title || body.title.length < 3) {
      recordRequest('POST', '/api/content', HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
      return apiError(ErrorCode.VALIDATION_ERROR, 'Title must be at least 3 characters', HttpStatus.UNPROCESSABLE_ENTITY, undefined, requestId);
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
