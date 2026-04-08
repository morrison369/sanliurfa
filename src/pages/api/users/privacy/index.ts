/**
 * Privacy Settings API
 * GET: Retrieve user's privacy settings
 * PUT: Update user's privacy settings
 */

import type { APIRoute } from 'astro';
import { getPrivacySettings, updatePrivacySettings } from '../../../../lib/privacy';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../lib/api';
import { recordRequest } from '../../../../lib/metrics';
import { logger } from '../../../../lib/logging';

export const GET: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user) {
      recordRequest('GET', '/api/users/privacy', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(
        ErrorCode.AUTH_REQUIRED,
        'Oturum açmanız gerekiyor',
        HttpStatus.UNAUTHORIZED,
        undefined,
        requestId
      );
    }

    const settings = await getPrivacySettings(locals.user.id);

    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/users/privacy', HttpStatus.OK, duration);

    return apiResponse(
      {
        success: true,
        data: settings
      },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/users/privacy', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Get privacy settings failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Gizlilik ayarları alınırken bir hata oluştu',
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
    if (!locals.user) {
      recordRequest('PUT', '/api/users/privacy', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(
        ErrorCode.AUTH_REQUIRED,
        'Oturum açmanız gerekiyor',
        HttpStatus.UNAUTHORIZED,
        undefined,
        requestId
      );
    }

    const body = await request.json();

    // Validate input - only allow specific fields
    const allowedFields = [
      'profile_public',
      'show_activity',
      'show_reviews',
      'show_email',
      'allow_messages',
      'show_followers'
    ];

    const updates: any = {};
    for (const field of allowedFields) {
      if (field in body) {
        if (typeof body[field] !== 'boolean') {
          recordRequest('PUT', '/api/users/privacy', HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
          return apiError(
            ErrorCode.VALIDATION_ERROR,
            `${field} boolean olmalıdır`,
            HttpStatus.UNPROCESSABLE_ENTITY,
            undefined,
            requestId
          );
        }
        updates[field] = body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      recordRequest('PUT', '/api/users/privacy', HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Güncelleme alanı sağlanmadı',
        HttpStatus.UNPROCESSABLE_ENTITY,
        undefined,
        requestId
      );
    }

    const settings = await updatePrivacySettings(locals.user.id, updates);

    const duration = Date.now() - startTime;
    recordRequest('PUT', '/api/users/privacy', HttpStatus.OK, duration);
    logger.logMutation('update', 'privacy_settings', settings.id, locals.user.id);

    return apiResponse(
      {
        success: true,
        data: settings,
        message: 'Gizlilik ayarları güncellendi'
      },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('PUT', '/api/users/privacy', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Update privacy settings failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Gizlilik ayarları güncellenirken bir hata oluştu',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
