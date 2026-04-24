/**
 * 2FA Verification Endpoint
 * Verify two-factor authentication code and complete setup
 */

import type { APIRoute } from 'astro';
import { verify2FAMethod, activate2FAMethod, generateRecoveryCodes } from '../../../../lib/two-factor-auth';
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

    // Verify code
    const isValid = await verify2FAMethod(method_id, code);
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
