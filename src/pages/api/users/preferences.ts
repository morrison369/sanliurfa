/**
 * User Notification Preferences API
 * GET: Get notification preferences
 * PUT: Update notification preferences
 */

import type { APIRoute } from 'astro';
import { getUserProfile, updateNotificationPreferences } from '../../../lib/users';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { recordRequest } from '../../../lib/metrics';
import { logger } from '../../../lib/logging';
import { validateWithSchema } from '../../../lib/validation';

const updatePreferencesSchema = {
  email: {
    type: 'boolean' as const,
    required: false
  },
  push: {
    type: 'boolean' as const,
    required: false
  },
  in_app: {
    type: 'boolean' as const,
    required: false
  },
  digest: {
    type: 'string' as const,
    required: false,
    pattern: '^(never|daily|weekly|monthly)$'
  }
};

export const GET: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    const user = locals.user;

    if (!user) {
      recordRequest('GET', '/api/users/preferences', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(
        ErrorCode.AUTH_REQUIRED,
        'Oturum açmanız gerekiyor',
        HttpStatus.UNAUTHORIZED,
        undefined,
        requestId
      );
    }

    const profile = await getUserProfile(user.id);

    if (!profile) {
      recordRequest('GET', '/api/users/preferences', HttpStatus.NOT_FOUND, Date.now() - startTime);
      return apiError(
        ErrorCode.NOT_FOUND,
        'Tercihler bulunamadı',
        HttpStatus.NOT_FOUND,
        undefined,
        requestId
      );
    }

    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/users/preferences', HttpStatus.OK, duration);

    return apiResponse(
      {
        success: true,
        data: profile.notification_preferences
      },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/users/preferences', HttpStatus.INTERNAL_SERVER_ERROR, duration);
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
    const user = locals.user;

    if (!user) {
      recordRequest('PUT', '/api/users/preferences', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(
        ErrorCode.AUTH_REQUIRED,
        'Oturum açmanız gerekiyor',
        HttpStatus.UNAUTHORIZED,
        undefined,
        requestId
      );
    }

    const body = await request.json();
    const validation = validateWithSchema(body, updatePreferencesSchema);

    if (!validation.valid) {
      recordRequest('PUT', '/api/users/preferences', HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Geçersiz giriş',
        HttpStatus.UNPROCESSABLE_ENTITY,
        validation.errors,
        requestId
      );
    }

    const preferences = {
      email: validation.data.email,
      push: validation.data.push,
      in_app: validation.data.in_app,
      digest: validation.data.digest
    };

    // Remove undefined values
    Object.keys(preferences).forEach(key => preferences[key as keyof typeof preferences] === undefined && delete preferences[key as keyof typeof preferences]);

    if (Object.keys(preferences).length === 0) {
      recordRequest('PUT', '/api/users/preferences', HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Güncellenecek bir tercih belirtin',
        HttpStatus.UNPROCESSABLE_ENTITY,
        undefined,
        requestId
      );
    }

    const success = await updateNotificationPreferences(user.id, preferences);

    if (!success) {
      recordRequest('PUT', '/api/users/preferences', HttpStatus.INTERNAL_SERVER_ERROR, Date.now() - startTime);
      return apiError(
        ErrorCode.INTERNAL_ERROR,
        'Tercihler güncellenirken bir hata oluştu',
        HttpStatus.INTERNAL_SERVER_ERROR,
        undefined,
        requestId
      );
    }

    const profile = await getUserProfile(user.id);

    const duration = Date.now() - startTime;
    recordRequest('PUT', '/api/users/preferences', HttpStatus.OK, duration);
    logger.logMutation('update', 'users', user.id, user.id, { action: 'update_preferences', fields: Object.keys(preferences) });

    return apiResponse(
      {
        success: true,
        data: profile?.notification_preferences
      },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('PUT', '/api/users/preferences', HttpStatus.INTERNAL_SERVER_ERROR, duration);
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
