/**
 * Notification Center API
 * GET: Get user notifications
 * POST: Manage notifications (read, archive, delete)
 */

import type { APIRoute } from 'astro';
import { getNotifications, markNotificationAsRead, archiveNotification, getUnreadNotificationCount } from '../../../lib/notification-delivery';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { recordRequest } from '../../../lib/metrics';
import { logger } from '../../../lib/logging';

export const GET: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.id) {
      recordRequest('GET', '/api/notifications/center', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(ErrorCode.AUTH_REQUIRED, 'Authentication required', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);
    const archived = url.searchParams.get('archived') === 'true';

    const [notifications, unreadCount] = await Promise.all([
      getNotifications(locals.user.id, limit, archived),
      getUnreadNotificationCount(locals.user.id)
    ]);

    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/notifications/center', HttpStatus.OK, duration);

    return apiResponse(
      {
        success: true,
        data: {
          notifications,
          unreadCount,
          count: notifications.length,
          limit
        }
      },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/notifications/center', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Get notifications failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Bildirimler alınırken bir hata oluştu',
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
    if (!locals.user?.id) {
      recordRequest('POST', '/api/notifications/center', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(ErrorCode.AUTH_REQUIRED, 'Authentication required', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const body = await request.json();
    const { action, notificationId } = body;

    if (!action || !notificationId) {
      recordRequest('POST', '/api/notifications/center', HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'action ve notificationId gereklidir',
        HttpStatus.UNPROCESSABLE_ENTITY,
        undefined,
        requestId
      );
    }

    if (action === 'read') {
      await markNotificationAsRead(notificationId, locals.user.id);
    } else if (action === 'archive') {
      await archiveNotification(notificationId, locals.user.id);
    }

    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/notifications/center', HttpStatus.OK, duration);

    logger.info('Notification action completed', { action, notificationId });

    return apiResponse(
      {
        success: true,
        message: `Bildirim işlemi tamamlandı: ${action}`
      },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/notifications/center', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Notification action failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Bildirim işlemi başarısız oldu',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
