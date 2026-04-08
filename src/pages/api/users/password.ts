/**
 * Change Password API
 * POST: Change user password (requires current password verification)
 */

import type { APIRoute } from 'astro';
import { changePassword } from '../../../lib/users';
import { queryOne } from '../../../lib/postgres';
import { verifyPassword } from '../../../lib/auth';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { recordRequest } from '../../../lib/metrics';
import { logger } from '../../../lib/logging';
import { validateWithSchema } from '../../../lib/validation';

const changePasswordSchema = {
  current_password: {
    type: 'string' as const,
    required: true,
    minLength: 1
  },
  new_password: {
    type: 'string' as const,
    required: true,
    minLength: 8,
    pattern: '^(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*]).*$'
  },
  confirm_password: {
    type: 'string' as const,
    required: true,
    minLength: 8
  }
};

export const POST: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    const user = locals.user;

    if (!user) {
      recordRequest('POST', '/api/users/password', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(
        ErrorCode.AUTH_REQUIRED,
        'Oturum açmanız gerekiyor',
        HttpStatus.UNAUTHORIZED,
        undefined,
        requestId
      );
    }

    const body = await request.json();
    const validation = validateWithSchema(body, changePasswordSchema);

    if (!validation.valid) {
      recordRequest('POST', '/api/users/password', HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Geçersiz giriş',
        HttpStatus.UNPROCESSABLE_ENTITY,
        validation.errors,
        requestId
      );
    }

    // Check password confirmation
    if (validation.data.new_password !== validation.data.confirm_password) {
      recordRequest('POST', '/api/users/password', HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Şifreler eşleşmiyor',
        HttpStatus.UNPROCESSABLE_ENTITY,
        undefined,
        requestId
      );
    }

    // Check new password doesn't match current password
    if (validation.data.new_password === validation.data.current_password) {
      recordRequest('POST', '/api/users/password', HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Yeni şifre, mevcut şifre ile aynı olamaz',
        HttpStatus.UNPROCESSABLE_ENTITY,
        undefined,
        requestId
      );
    }

    // Verify current password
    const userRecord = await queryOne('SELECT password_hash FROM users WHERE id = $1', [user.id]);

    if (!userRecord) {
      recordRequest('POST', '/api/users/password', HttpStatus.NOT_FOUND, Date.now() - startTime);
      return apiError(
        ErrorCode.NOT_FOUND,
        'Kullanıcı bulunamadı',
        HttpStatus.NOT_FOUND,
        undefined,
        requestId
      );
    }

    const isCorrect = await verifyPassword(validation.data.current_password, userRecord.password_hash);

    if (!isCorrect) {
      recordRequest('POST', '/api/users/password', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      logger.warn('Failed password change attempt - incorrect current password', { userId: user.id });
      return apiError(
        ErrorCode.AUTH_FAILED,
        'Mevcut şifre hatalı',
        HttpStatus.UNAUTHORIZED,
        undefined,
        requestId
      );
    }

    // Change password
    const success = await changePassword(user.id, validation.data.new_password);

    if (!success) {
      recordRequest('POST', '/api/users/password', HttpStatus.INTERNAL_SERVER_ERROR, Date.now() - startTime);
      return apiError(
        ErrorCode.INTERNAL_ERROR,
        'Şifre değiştirilirken bir hata oluştu',
        HttpStatus.INTERNAL_SERVER_ERROR,
        undefined,
        requestId
      );
    }

    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/users/password', HttpStatus.OK, duration);
    logger.logMutation('update', 'users', user.id, user.id, { action: 'change_password' });

    return apiResponse(
      {
        success: true,
        message: 'Şifre başarıyla değiştirildi'
      },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/users/password', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Change password failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Şifre değiştirilirken bir hata oluştu',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
