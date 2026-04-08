import type { APIRoute } from 'astro';
import { getBlogPostRevisions, restoreBlogPostRevision } from '../../../../../lib/blog';
import { verifyToken } from '../../../../../lib/auth';
import { queryOne } from '../../../../../lib/postgres';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../../lib/api';
import { recordRequest } from '../../../../../lib/metrics';
import { logger } from '../../../../../lib/logging';

export const GET: APIRoute = async ({ request, params }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    const postId = parseInt(params.id);
    if (isNaN(postId)) {
      recordRequest('GET', `/api/blog/posts/${params.id}/revisions`, HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(ErrorCode.VALIDATION_ERROR, 'Invalid post ID', HttpStatus.BAD_REQUEST, undefined, requestId);
    }

    // Get revisions
    const revisions = await getBlogPostRevisions(postId);

    const duration = Date.now() - startTime;
    recordRequest('GET', `/api/blog/posts/${params.id}/revisions`, HttpStatus.OK, duration);

    return apiResponse(
      {
        success: true,
        data: {
          postId,
          revisions
        }
      },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', `/api/blog/posts/${params.id}/revisions`, HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Revisions request failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Failed to fetch revisions', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};

/**
 * POST /api/blog/posts/:id/revisions/:revisionId/restore
 * Restore post to specific revision (admin only)
 */
export const POST: APIRoute = async ({ request, params }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    // Check authentication
    const cookie = request.headers.get('Cookie');
    const tokenMatch = cookie?.match(/auth-token=([^;]+)/);
    const token = tokenMatch?.[1];

    if (!token) {
      recordRequest('POST', `/api/blog/posts/${params.id}/revisions`, HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(ErrorCode.AUTH_REQUIRED, 'Authentication required', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const sessionData = await verifyToken(token);
    if (!sessionData || sessionData.role !== 'admin') {
      recordRequest('POST', `/api/blog/posts/${params.id}/revisions`, HttpStatus.FORBIDDEN, Date.now() - startTime);
      return apiError(ErrorCode.FORBIDDEN, 'Admin access required', HttpStatus.FORBIDDEN, undefined, requestId);
    }

    // Parse request
    const body = await request.json();
    const postId = parseInt(params.id);
    const revisionId = body.revisionId;

    if (isNaN(postId) || !revisionId) {
      recordRequest('POST', `/api/blog/posts/${params.id}/revisions`, HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(ErrorCode.VALIDATION_ERROR, 'Invalid parameters', HttpStatus.BAD_REQUEST, undefined, requestId);
    }

    // Restore revision
    const success = await restoreBlogPostRevision(postId, revisionId);

    if (!success) {
      recordRequest('POST', `/api/blog/posts/${params.id}/revisions`, HttpStatus.NOT_FOUND, Date.now() - startTime);
      return apiError(ErrorCode.NOT_FOUND, 'Revision not found', HttpStatus.NOT_FOUND, undefined, requestId);
    }

    const duration = Date.now() - startTime;
    recordRequest('POST', `/api/blog/posts/${params.id}/revisions`, HttpStatus.OK, duration);

    return apiResponse(
      {
        success: true,
        data: {
          message: 'Revision restored successfully'
        }
      },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('POST', `/api/blog/posts/${params.id}/revisions`, HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Revision restore failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Failed to restore revision', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
