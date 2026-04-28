/**
 * 2FA Verification Endpoint
 * Verify two-factor authentication code and complete setup
 */

import type { APIRoute } from 'astro';
import { verifyTOTPCode } from '../../../../lib/two-factor';
import { activate2FAMethod, generateRecoveryCodes } from '../../../../lib/two-factor-auth';
import { queryOne, update } from '../../../../lib/postgres';
import { deleteCache } from '../../../../lib/cache';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../lib/api';
import { logger } from '../../../../lib/logging';

type VerifyBody = {
  method_id?: unknown;
  code?: unknown;
};

export const POST: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId(request);
  logger.setRequestId(requestId);

  try {
    // Auth check
    if (!locals.user) {
      return apiError(ErrorCode.UNAUTHORIZED, 'Oturum gerekli', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const body = (await request.json()) as VerifyBody;
    const { method_id, code } = body;

    if (typeof method_id !== 'string' || typeof code !== 'string') {
      return apiError(ErrorCode.VALIDATION_ERROR, 'Yöntem ID ve kod gerekli', HttpStatus.UNPROCESSABLE_ENTITY, undefined, requestId);
    }

    // Fetch method and verify using safe TOTP comparison (timingSafeEqual via verifyTOTPCode)
    const method = await queryOne(
      'SELECT id, user_id, method_type, secret_key FROM user_2fa_methods WHERE id = $1',
      [method_id]
    );
    if (!method) {
      return apiError(ErrorCode.NOT_FOUND, 'Yöntem bulunamadı', HttpStatus.NOT_FOUND, undefined, requestId);
    }

    // IDOR guard: method must belong to the authenticated user
    if (method.user_id !== locals.user.id) {
      return apiError(ErrorCode.FORBIDDEN, 'Bu yönteme erişim izniniz yok', HttpStatus.FORBIDDEN, undefined, requestId);
    }

    let isValid = false;
    if (method.method_type === 'totp') {
      isValid = verifyTOTPCode(method.secret_key, code);
      if (isValid) {
        await update('user_2fa_methods', { id: method_id }, { is_verified: true });
        await deleteCache(`user:2fa:${method.user_id}`);
      }
    } else {
      // Email/SMS: code validated externally during setup
      isValid = true;
    }

    if (!isValid) {
      return apiError(ErrorCode.AUTHENTICATION_FAILED, 'Doğrulama kodu geçersiz', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    // Activate method
    const activated = await activate2FAMethod(method_id);
    if (!activated) {
      return apiError(ErrorCode.INTERNAL_ERROR, 'Yöntem etkinleştirilemedi', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
    }

    // Generate recovery codes
    const codes = await generateRecoveryCodes(method_id);

    logger.info('2FA method verified and activated', { userId: locals.user.id, methodId: method_id });

    return apiResponse({
      success: true,
      data: {
        message: '2FA etkinleştirildi',
        recovery_codes: codes,
      },
    }, HttpStatus.OK, requestId);
  } catch (error) {
    logger.error('2FA verification failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Doğrulama başarısız', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
