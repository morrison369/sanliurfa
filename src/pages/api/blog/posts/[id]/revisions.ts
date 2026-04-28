import type { APIRoute } from 'astro';
import { getBlogPostRevisions, restoreBlogPostRevision } from '../../../../../lib/blog/blog';
import { verifyToken } from '../../../../../lib/auth';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../../lib/api';
import { recordRequest } from '../../../../../lib/metrics';
import { logger } from '../../../../../lib/logging';

type RestoreRevisionBody = {
  revisionId?: number | string;
};

export const GET: APIRoute = async ({ request, params }) => {
  const requestId = getRequestId(request);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    const cookie = request.headers.get('Cookie');
    const tokenMatch = cookie?.match(/auth-token=([^;]+)/);
    const token = tokenMatch?.[1];
    if (!token) {
      recordRequest('GET', `/api/blog/posts/${params.id}/revisions`, HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(ErrorCode.UNAUTHORIZED, 'Kimlik doğrulama gerekli', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }
    const sessionData = await verifyToken(token);
    if (!sessionData || sessionData.role !== 'admin') {
      recordRequest('GET', `/api/blog/posts/${params.id}/revisions`, HttpStatus.FORBIDDEN, Date.now() - startTime);
      return apiError(ErrorCode.FORBIDDEN, 'Admin yetkisi gerekli', HttpStatus.FORBIDDEN, undefined, requestId);
    }

    const postId = Number.parseInt(params.id || '', 10);
    if (!Number.isFinite(postId)) {
      recordRequest('GET', `/api/blog/posts/${params.id}/revisions`, HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(ErrorCode.VALIDATION_ERROR, 'Geçersiz blog yazısı ID', HttpStatus.BAD_REQUEST, undefined, requestId);
    }

    const revisions = await getBlogPostRevisions(postId);

    const duration = Date.now() - startTime;
    recordRequest('GET', `/api/blog/posts/${params.id}/revisions`, HttpStatus.OK, duration);

    return apiResponse(
      {
        success: true,
        data: {
          postId,
          revisions,
        },
      },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', `/api/blog/posts/${params.id}/revisions`, HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Revizyon listesi alınamadı', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Revizyonlar alınamadı', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};

/**
 * POST /api/blog/posts/:id/revisions/:revisionId/restore
 * Restore post to specific revision (admin only)
 */
export const POST: APIRoute = async ({ request, params }) => {
  const requestId = getRequestId(request);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    // Check authentication
    const cookie = request.headers.get('Cookie');
    const tokenMatch = cookie?.match(/auth-token=([^;]+)/);
    const token = tokenMatch?.[1];

    if (!token) {
      recordRequest('POST', `/api/blog/posts/${params.id}/revisions`, HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(ErrorCode.UNAUTHORIZED, 'Kimlik doğrulama gerekli', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const sessionData = await verifyToken(token);
    if (!sessionData || sessionData.role !== 'admin') {
      recordRequest('POST', `/api/blog/posts/${params.id}/revisions`, HttpStatus.FORBIDDEN, Date.now() - startTime);
      return apiError(ErrorCode.FORBIDDEN, 'Admin yetkisi gerekli', HttpStatus.FORBIDDEN, undefined, requestId);
    }

    const body = (await request.json().catch(() => ({}))) as RestoreRevisionBody;
    const postId = Number.parseInt(params.id || '', 10);
    const revisionId = Number.parseInt(String(body.revisionId || ''), 10);

    if (!Number.isFinite(postId) || !Number.isFinite(revisionId)) {
      recordRequest('POST', `/api/blog/posts/${params.id}/revisions`, HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(ErrorCode.VALIDATION_ERROR, 'Geçersiz revizyon parametreleri', HttpStatus.BAD_REQUEST, undefined, requestId);
    }

    const success = await restoreBlogPostRevision(postId, revisionId);

    if (!success) {
      recordRequest('POST', `/api/blog/posts/${params.id}/revisions`, HttpStatus.NOT_FOUND, Date.now() - startTime);
      return apiError(ErrorCode.NOT_FOUND, 'Revizyon bulunamadı', HttpStatus.NOT_FOUND, undefined, requestId);
    }

    const duration = Date.now() - startTime;
    recordRequest('POST', `/api/blog/posts/${params.id}/revisions`, HttpStatus.OK, duration);

    return apiResponse(
      {
        success: true,
        data: {
          message: 'Revizyon başarıyla geri yüklendi',
        },
      },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('POST', `/api/blog/posts/${params.id}/revisions`, HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Revizyon geri yükleme başarısız', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Revizyon geri yüklenemedi', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
