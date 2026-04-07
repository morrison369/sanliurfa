import type { APIRoute } from 'astro';
import { markAllAsRead } from '../../../lib/notifications-queue';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { recordRequest } from '../../../lib/metrics';
import { logger } from '../../../lib/logging';

export const PUT: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.id) {
      recordRequest('PUT', '/api/notifications/read-all', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(ErrorCode.AUTH_REQUIRED, 'Kimlik dogrulama gerekli', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const count = await markAllAsRead(locals.user.id);

    const duration = Date.now() - startTime;
    recordRequest('PUT', '/api/notifications/read-all', HttpStatus.OK, duration);

    logger.info('Marked all notifications as read', { userId: locals.user.id, count });

    return apiResponse({ success: true, markedCount: count }, HttpStatus.OK, requestId);
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('PUT', '/api/notifications/read-all', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Failed to mark all as read', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Ichsel sunucu hatasi', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
