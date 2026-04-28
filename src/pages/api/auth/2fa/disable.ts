/**
 * Disable 2FA
 * DELETE /api/auth/2fa
 * Body: { password: string }
 * Password re-confirmation required — prevents session-theft attacker from disabling 2FA.
 */

import type { APIRoute } from 'astro';
import bcrypt from 'bcryptjs';
import { disableTwoFactor } from '../../../../lib/two-factor';
import { queryOne } from '../../../../lib/postgres';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../lib/api';
import { recordRequest } from '../../../../lib/metrics';
import { logger } from '../../../../lib/logging';

export const DELETE: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId(request);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user) {
      recordRequest('DELETE', '/api/auth/2fa', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(ErrorCode.UNAUTHORIZED, 'Oturum gerekli', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const body = await request.json().catch(() => ({}));
    const { password } = body as { password?: unknown };

    if (!password || typeof password !== 'string') {
      recordRequest('DELETE', '/api/auth/2fa', HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
      return apiError(ErrorCode.VALIDATION_ERROR, 'Şifre gerekli', HttpStatus.UNPROCESSABLE_ENTITY, undefined, requestId);
    }

    const userRecord = await queryOne<{ password_hash: string }>(
      'SELECT password_hash FROM users WHERE id = $1',
      [locals.user.id],
    );

    if (!userRecord) {
      recordRequest('DELETE', '/api/auth/2fa', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(ErrorCode.UNAUTHORIZED, 'Kullanıcı bulunamadı', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const isPasswordValid = await bcrypt.compare(password, userRecord.password_hash);
    if (!isPasswordValid) {
      recordRequest('DELETE', '/api/auth/2fa', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(ErrorCode.AUTHENTICATION_FAILED, 'Şifre hatalı', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const success = await disableTwoFactor(locals.user.id);

    if (!success) {
      recordRequest('DELETE', '/api/auth/2fa', HttpStatus.INTERNAL_SERVER_ERROR, Date.now() - startTime);
      return apiError(ErrorCode.INTERNAL_ERROR, '2FA devre dışı bırakılamadı', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
    }

    recordRequest('DELETE', '/api/auth/2fa', HttpStatus.OK, Date.now() - startTime);

    return apiResponse(
      { success: true, message: '2FA devre dışı bırakıldı' },
      HttpStatus.OK,
      requestId,
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('DELETE', '/api/auth/2fa', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Failed to disable 2FA', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Devre dışı bırakma başarısız', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
