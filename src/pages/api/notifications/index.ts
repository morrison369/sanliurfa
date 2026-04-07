import type { APIRoute } from 'astro';
import { getUnreadNotifications } from '../../../lib/notifications-queue';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { recordRequest } from '../../../lib/metrics';
import { logger } from '../../../lib/logging';

export const GET: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.id) {
      recordRequest('GET', '/api/notifications', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(ErrorCode.AUTH_REQUIRED, 'Kimlik dogrulama gerekli', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);

    const notifications = await getUnreadNotifications(locals.user.id, limit);

    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/notifications', HttpStatus.OK, duration);

    return apiResponse({ notifications, count: notifications.length }, HttpStatus.OK, requestId);
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/notifications', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Failed to get notifications', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Ichsel sunucu hatasi', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
