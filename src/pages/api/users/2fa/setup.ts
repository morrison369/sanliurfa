/**
 * Initiate 2FA setup
 * POST /api/users/2fa/setup
 * Returns secret and QR code URL for scanning with authenticator app
 */

import type { APIRoute } from 'astro';
import { setupTwoFactor } from '../../../../lib/two-factor';
import { verifyPassword } from '../../../../lib/auth';
import { queryOne } from '../../../../lib/postgres';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../lib/api';
import { logger } from '../../../../lib/logging';
import { setCache } from '../../../../lib/cache';
import { setTwoFactorSetupSecret } from '../../../../lib/two-factor-setup-store';

export const POST: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId(request);
  logger.setRequestId(requestId);

  try {
    // Auth required
    if (!locals.user) {
      return apiError(ErrorCode.UNAUTHORIZED, 'Oturum gerekli', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const userId = locals.user.id;

    // HARD RULE #42: Re-verify password before sensitive operation
    const body = await request.json();
    const { password } = body || {};
    if (!password || typeof password !== 'string') {
      return apiError(ErrorCode.VALIDATION_ERROR, 'Şifre gerekli', HttpStatus.UNPROCESSABLE_ENTITY, undefined, requestId);
    }
    const userRecord = await queryOne<{ password_hash: string }>('SELECT password_hash FROM users WHERE id = $1', [userId]);
    if (!userRecord || !(await verifyPassword(password, userRecord.password_hash))) {
      return apiError(ErrorCode.AUTH_FAILED, 'Şifre hatalı', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    // Generate 2FA secret
    const setupResult = await setupTwoFactor(userId);
    if (!setupResult) {
      return apiError(ErrorCode.INTERNAL_ERROR, '2FA sırrı üretilemedi', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
    }
    const { secret, qrCodeUrl, backupCodes } = setupResult;

    // Store secret temporarily for setup verification; fallback to in-memory store when cache is unavailable.
    setTwoFactorSetupSecret(userId, secret, 600);
    try {
      await setCache(`2fa:setup:${userId}`, secret, 600);
    } catch (cacheError) {
      logger.warn('2FA setup cache unavailable, using in-memory fallback', { userId });
    }

    logger.info('2FA setup initiated', { userId });

    return apiResponse({
      success: true,
      message: '2FA kurulumu başlatıldı. QR kodu doğrulama uygulamasıyla tarayın.',
      secret,
      qrCodeUrl,
      backupCodes,
    }, HttpStatus.OK, requestId);
  } catch (error) {
    logger.error('Failed to setup 2FA', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, '2FA kurulamadı', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
