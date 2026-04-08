/**
 * Push Notification Subscription
 * Web Push API subscription management
 */

import type { APIRoute } from 'astro';
import { addPushSubscription, removePushSubscription } from '../../../../lib/notification-channels';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../lib/api';
import { recordRequest } from '../../../../lib/metrics';
import { logger } from '../../../../lib/logging';

export const POST: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.id) {
      recordRequest('POST', '/api/notifications/push/subscribe', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(
        ErrorCode.AUTH_REQUIRED,
        'Authentication required',
        HttpStatus.UNAUTHORIZED,
        undefined,
        requestId
      );
    }

    const body = await request.json();
    const { endpoint, keys } = body;

    if (!endpoint || !keys?.auth || !keys?.p256dh) {
      recordRequest('POST', '/api/notifications/push/subscribe', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'endpoint and keys (auth, p256dh) required',
        HttpStatus.BAD_REQUEST,
        undefined,
        requestId
      );
    }

    const subscription = await addPushSubscription(
      locals.user.id,
      endpoint,
      keys.auth,
      keys.p256dh
    );

    if (!subscription) {
      recordRequest('POST', '/api/notifications/push/subscribe', HttpStatus.CONFLICT, Date.now() - startTime);
      return apiError(
        ErrorCode.CONFLICT,
        'Subscription already exists',
        HttpStatus.CONFLICT,
        undefined,
        requestId
      );
    }

    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/notifications/push/subscribe', HttpStatus.CREATED, duration);
    logger.info('Push subscription created', { userId: locals.user.id });

    return apiResponse(
      {
        success: true,
        data: subscription
      },
      HttpStatus.CREATED,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/notifications/push/subscribe', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error(
      'Failed to subscribe to push',
      error instanceof Error ? error : new Error(String(error))
    );
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to subscribe',
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
      recordRequest('DELETE', '/api/notifications/push/subscribe', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(
        ErrorCode.AUTH_REQUIRED,
        'Authentication required',
        HttpStatus.UNAUTHORIZED,
        undefined,
        requestId
      );
    }

    const body = await request.json();
    const { endpoint } = body;

    if (!endpoint) {
      recordRequest('DELETE', '/api/notifications/push/subscribe', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'endpoint required',
        HttpStatus.BAD_REQUEST,
        undefined,
        requestId
      );
    }

    const success = await removePushSubscription(endpoint);

    if (!success) {
      recordRequest('DELETE', '/api/notifications/push/subscribe', HttpStatus.NOT_FOUND, Date.now() - startTime);
      return apiError(
        ErrorCode.NOT_FOUND,
        'Subscription not found',
        HttpStatus.NOT_FOUND,
        undefined,
        requestId
      );
    }

    const duration = Date.now() - startTime;
    recordRequest('DELETE', '/api/notifications/push/subscribe', HttpStatus.OK, duration);
    logger.info('Push subscription removed', { userId: locals.user.id });

    return apiResponse(
      {
        success: true,
        message: 'Unsubscribed from push notifications'
      },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('DELETE', '/api/notifications/push/subscribe', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error(
      'Failed to unsubscribe from push',
      error instanceof Error ? error : new Error(String(error))
    );
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to unsubscribe',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
