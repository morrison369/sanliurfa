/**
 * Push Notification Subscribe API
 * POST: Subscribe to push notifications
 * DELETE: Unsubscribe from push notifications
 */

import type { APIRoute } from 'astro';
import { subscribeToPushNotifications, unsubscribeFromPushNotifications, getPushSubscriptionStats } from '../../../lib/push-notifications';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { recordRequest } from '../../../lib/metrics';
import { logger } from '../../../lib/logging';

export const POST: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.id) {
      recordRequest('POST', '/api/notifications/subscribe', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(ErrorCode.AUTH_REQUIRED, 'Authentication required', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const body = await request.json();
    const { endpoint, authKey, p256dhKey, deviceType, deviceName, browser, os } = body;

    if (!endpoint || !authKey || !p256dhKey) {
      recordRequest('POST', '/api/notifications/subscribe', HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'endpoint, authKey, ve p256dhKey gereklidir',
        HttpStatus.UNPROCESSABLE_ENTITY,
        undefined,
        requestId
      );
    }

    const subscriptionId = await subscribeToPushNotifications(
      locals.user.id,
      endpoint,
      authKey,
      p256dhKey,
      { deviceType, deviceName, browser, os }
    );

    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/notifications/subscribe', HttpStatus.CREATED, duration);

    return apiResponse(
      {
        success: true,
        data: {
          subscriptionId,
          message: 'Push bildirimlere abone olundu'
        }
      },
      HttpStatus.CREATED,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/notifications/subscribe', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Push subscribe failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Abonelik başarısız oldu',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};

export const DELETE: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.id) {
      recordRequest('DELETE', '/api/notifications/subscribe', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(ErrorCode.AUTH_REQUIRED, 'Authentication required', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const body = await request.json();
    const { endpoint } = body;

    if (!endpoint) {
      recordRequest('DELETE', '/api/notifications/subscribe', HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'endpoint gereklidir',
        HttpStatus.UNPROCESSABLE_ENTITY,
        undefined,
        requestId
      );
    }

    await unsubscribeFromPushNotifications(locals.user.id, endpoint);

    const duration = Date.now() - startTime;
    recordRequest('DELETE', '/api/notifications/subscribe', HttpStatus.OK, duration);

    return apiResponse(
      {
        success: true,
        message: 'Push bildirimlerden abonelik iptal edildi'
      },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('DELETE', '/api/notifications/subscribe', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Push unsubscribe failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Abonelik iptal işlemi başarısız oldu',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};

export const GET: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.id) {
      recordRequest('GET', '/api/notifications/subscribe', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(ErrorCode.AUTH_REQUIRED, 'Authentication required', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const stats = await getPushSubscriptionStats(locals.user.id);

    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/notifications/subscribe', HttpStatus.OK, duration);

    return apiResponse(
      {
        success: true,
        data: stats
      },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/notifications/subscribe', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Get subscription stats failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'İstatistikler alınamadı',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
