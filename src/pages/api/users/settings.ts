/**
 * User Settings API
 * GET: Get user settings
 * PUT: Update user settings (language, theme, notification/privacy preferences)
 */

import type { APIRoute } from 'astro';
import { getUserProfile, updateUserSettings } from '../../../lib/users';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { recordRequest } from '../../../lib/metrics';
import { logger } from '../../../lib/logging';
import { validateWithSchema } from '../../../lib/validation';

const updateSettingsSchema = {
  language_preference: {
    type: 'string' as const,
    required: false,
    pattern: '^[a-z]{2}(-[A-Z]{2})?$'
  },
  theme_preference: {
    type: 'string' as const,
    required: false,
    pattern: '^(light|dark|auto)$'
  },
  notification_preferences: {
    type: 'object' as const,
    required: false
  },
  privacy_settings: {
    type: 'object' as const,
    required: false
  }
};

export const GET: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    const user = locals.user;

    if (!user) {
      recordRequest('GET', '/api/users/settings', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
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
      recordRequest('GET', '/api/users/settings', HttpStatus.NOT_FOUND, Date.now() - startTime);
      return apiError(
        ErrorCode.NOT_FOUND,
        'Ayarlar bulunamadı',
        HttpStatus.NOT_FOUND,
        undefined,
        requestId
      );
    }

    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/users/settings', HttpStatus.OK, duration);

    return apiResponse(
      {
        success: true,
        data: {
          language_preference: profile.language_preference,
          theme_preference: profile.theme_preference,
          notification_preferences: profile.notification_preferences,
          privacy_settings: profile.privacy_settings,
          two_factor_enabled: profile.two_factor_enabled
        }
      },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/users/settings', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Get settings failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Ayarlar alınırken bir hata oluştu',
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
      recordRequest('PUT', '/api/users/settings', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(
        ErrorCode.AUTH_REQUIRED,
        'Oturum açmanız gerekiyor',
        HttpStatus.UNAUTHORIZED,
        undefined,
        requestId
      );
    }

    const body = await request.json();
    const validation = validateWithSchema(body, updateSettingsSchema);

    if (!validation.valid) {
      recordRequest('PUT', '/api/users/settings', HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Geçersiz giriş',
        HttpStatus.UNPROCESSABLE_ENTITY,
        validation.errors,
        requestId
      );
    }

    const updates = {
      language_preference: validation.data.language_preference,
      theme_preference: validation.data.theme_preference,
      notification_preferences: validation.data.notification_preferences,
      privacy_settings: validation.data.privacy_settings
    };

    // Remove undefined values
    Object.keys(updates).forEach(key => updates[key as keyof typeof updates] === undefined && delete updates[key as keyof typeof updates]);

    if (Object.keys(updates).length === 0) {
      recordRequest('PUT', '/api/users/settings', HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Güncellenecek bir ayar belirtin',
        HttpStatus.UNPROCESSABLE_ENTITY,
        undefined,
        requestId
      );
    }

    const updatedProfile = await updateUserSettings(user.id, updates);

    const duration = Date.now() - startTime;
    recordRequest('PUT', '/api/users/settings', HttpStatus.OK, duration);
    logger.logMutation('update', 'users', user.id, user.id, { action: 'update_settings', fields: Object.keys(updates) });

    return apiResponse(
      {
        success: true,
        data: {
          language_preference: updatedProfile.language_preference,
          theme_preference: updatedProfile.theme_preference,
          notification_preferences: updatedProfile.notification_preferences,
          privacy_settings: updatedProfile.privacy_settings,
          two_factor_enabled: updatedProfile.two_factor_enabled
        }
      },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('PUT', '/api/users/settings', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Update settings failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Ayarlar güncellenirken bir hata oluştu',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
