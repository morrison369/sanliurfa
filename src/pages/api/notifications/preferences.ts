/**
 * Notification Preferences API
 * GET: Get notification preferences
 * PUT: Update notification preferences
 */

import type { APIRoute } from 'astro';
import { getNotificationTypePreferences, updateNotificationTypePreferences } from '../../../lib/notification-delivery';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { recordRequest } from '../../../lib/metrics';
import { logger } from '../../../lib/logging';

export const GET: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.id) {
      recordRequest('GET', '/api/notifications/preferences', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(ErrorCode.AUTH_REQUIRED, 'Authentication required', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const url = new URL(request.url);
    const notificationType = url.searchParams.get('type');

    if (!notificationType) {
      recordRequest('GET', '/api/notifications/preferences', HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'type parametresi gereklidir',
        HttpStatus.UNPROCESSABLE_ENTITY,
        undefined,
        requestId
      );
    }

    const prefs = await getNotificationTypePreferences(locals.user.id, notificationType);

    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/notifications/preferences', HttpStatus.OK, duration);

    return apiResponse(
      {
        success: true,
        data: {
          notificationType,
          preferences: prefs
        }
      },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/notifications/preferences', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Get preferences failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Tercihler alınırken bir hata oluştu',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};

export const PUT: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.id) {
      recordRequest('PUT', '/api/notifications/preferences', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(ErrorCode.AUTH_REQUIRED, 'Authentication required', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const body = await request.json();
    const { notificationType, preferences } = body;

    if (!notificationType || !preferences) {
      recordRequest('PUT', '/api/notifications/preferences', HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'notificationType ve preferences gereklidir',
        HttpStatus.UNPROCESSABLE_ENTITY,
        undefined,
        requestId
      );
    }

    await updateNotificationTypePreferences(locals.user.id, notificationType, preferences);

    const duration = Date.now() - startTime;
    recordRequest('PUT', '/api/notifications/preferences', HttpStatus.OK, duration);

    logger.info('Notification preferences updated', { userId: locals.user.id, notificationType });

    return apiResponse(
      {
        success: true,
        message: 'Bildirim tercihleri güncellendi'
      },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('PUT', '/api/notifications/preferences', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Update preferences failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Tercihler güncellenirken bir hata oluştu',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
