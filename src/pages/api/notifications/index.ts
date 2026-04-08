import type { APIRoute } from 'astro';
import { getUserNotifications, getUnreadNotifications } from '../../../lib/notifications-queue';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { recordRequest } from '../../../lib/metrics';
import { logger } from '../../../lib/logging';

export const GET: APIRoute = async ({ request, locals, url }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.id) {
      recordRequest('GET', '/api/notifications', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(ErrorCode.AUTH_REQUIRED, 'Oturum açmanız gerekiyor', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);
    const filter = url.searchParams.get('filter') || 'all'; // all, unread

    let notifications;

    if (filter === 'unread') {
      notifications = await getUnreadNotifications(locals.user.id, limit);
    } else {
      const result = await getUserNotifications(locals.user.id, 1, limit);
      notifications = result.notifications;
    }

    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/notifications', HttpStatus.OK, duration);

    return apiResponse(
      {
        success: true,
        data: notifications,
        count: notifications.length,
        filter
      },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/notifications', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Failed to get notifications', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Bildirimler alınırken bir hata oluştu', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
