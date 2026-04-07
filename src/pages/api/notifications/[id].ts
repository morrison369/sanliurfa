import type { APIRoute } from 'astro';
import { markAsRead, deleteNotification } from '../../../lib/notifications-queue';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { recordRequest } from '../../../lib/metrics';
import { logger } from '../../../lib/logging';

export const PUT: APIRoute = async ({ request, locals, params }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.id) {
      recordRequest('PUT', `/api/notifications/${params.id}`, HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(ErrorCode.AUTH_REQUIRED, 'Kimlik dogrulama gerekli', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const success = await markAsRead(params.id || '', locals.user.id);

    const duration = Date.now() - startTime;
    recordRequest('PUT', `/api/notifications/${params.id}`, success ? HttpStatus.OK : HttpStatus.NOT_FOUND, duration);

    if (!success) {
      return apiError(ErrorCode.NOT_FOUND, 'Bildirim bulunamadi', HttpStatus.NOT_FOUND, undefined, requestId);
    }

    return apiResponse({ success: true }, HttpStatus.OK, requestId);
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('PUT', `/api/notifications/${params.id}`, HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Failed to mark notification as read', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Ichsel sunucu hatasi', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};

export const DELETE: APIRoute = async ({ request, locals, params }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.id) {
      recordRequest('DELETE', `/api/notifications/${params.id}`, HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(ErrorCode.AUTH_REQUIRED, 'Kimlik dogrulama gerekli', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const success = await deleteNotification(params.id || '', locals.user.id);

    const duration = Date.now() - startTime;
    recordRequest('DELETE', `/api/notifications/${params.id}`, success ? HttpStatus.OK : HttpStatus.NOT_FOUND, duration);

    if (!success) {
      return apiError(ErrorCode.NOT_FOUND, 'Bildirim bulunamadi', HttpStatus.NOT_FOUND, undefined, requestId);
    }

    return apiResponse({ success: true }, HttpStatus.OK, requestId);
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('DELETE', `/api/notifications/${params.id}`, HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Failed to delete notification', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Ichsel sunucu hatasi', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
