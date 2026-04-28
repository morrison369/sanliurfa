/**
 * 2FA Setup Endpoint
 * POST /api/auth/2fa
 * Body: { method_type: 'totp'|'email'|'sms', method_identifier?: string, password: string }
 * Password re-confirmation required — prevents session-theft attacker from enrolling their own authenticator.
 */

import type { APIRoute } from 'astro';
import bcrypt from 'bcryptjs';
import { create2FAMethod } from '../../../../lib/two-factor-auth';
import { queryOne } from '../../../../lib/postgres';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../lib/api';
import { logger } from '../../../../lib/logging';

type TwoFactorMethodType = 'totp' | 'email' | 'sms';
type SetupBody = {
  method_type?: unknown;
  method_identifier?: unknown;
  password?: unknown;
};

type SetupResponse = {
  success: true;
  data: {
    method_id: string;
    method_type: TwoFactorMethodType;
    backup_codes_count: number;
    totp_uri?: string;
    secret_key?: string;
  };
};

function isTwoFactorMethodType(value: unknown): value is TwoFactorMethodType {
  return value === 'totp' || value === 'email' || value === 'sms';
}

export const POST: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId(request);
  logger.setRequestId(requestId);

  try {
    if (!locals.user) {
      return apiError(ErrorCode.UNAUTHORIZED, 'Oturum gerekli', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const body = (await request.json()) as SetupBody;
    const { method_type, method_identifier, password } = body;

    if (!password || typeof password !== 'string') {
      return apiError(ErrorCode.VALIDATION_ERROR, 'Şifre gerekli', HttpStatus.UNPROCESSABLE_ENTITY, undefined, requestId);
    }

    if (!isTwoFactorMethodType(method_type)) {
      return apiError(ErrorCode.VALIDATION_ERROR, '2FA yöntemi geçersiz', HttpStatus.UNPROCESSABLE_ENTITY, undefined, requestId);
    }

    if (method_type !== 'totp' && typeof method_identifier !== 'string') {
      return apiError(ErrorCode.VALIDATION_ERROR, `${method_type} tanımlayıcısı gerekli`, HttpStatus.UNPROCESSABLE_ENTITY, undefined, requestId);
    }

    const userRecord = await queryOne<{ password_hash: string }>(
      'SELECT password_hash FROM users WHERE id = $1',
      [locals.user.id],
    );

    if (!userRecord) {
      return apiError(ErrorCode.UNAUTHORIZED, 'Kullanıcı bulunamadı', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const isPasswordValid = await bcrypt.compare(password, userRecord.password_hash);
    if (!isPasswordValid) {
      return apiError(ErrorCode.AUTHENTICATION_FAILED, 'Şifre hatalı', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const method = await create2FAMethod(
      locals.user.id,
      method_type,
      typeof method_identifier === 'string' ? method_identifier : '',
    );

    if (!method) {
      return apiError(ErrorCode.INTERNAL_ERROR, '2FA yöntemi oluşturulamadı', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
    }

    logger.info('2FA method setup initiated', { userId: locals.user.id, methodType: method_type });

    const response: SetupResponse = {
      success: true,
      data: {
        method_id: method.id,
        method_type: method.method_type,
        backup_codes_count: method.backup_codes?.length || 0,
      },
    };

    if (method_type === 'totp') {
      response.data.totp_uri = `otpauth://totp/Sanliurfa:${locals.user.email}?secret=${method.secret_key}&issuer=Sanliurfa`;
      response.data.secret_key = method.secret_key;
    }

    return apiResponse(response, HttpStatus.CREATED, requestId);
  } catch (error) {
    logger.error('2FA setup failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, '2FA kurulumu başarısız', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
