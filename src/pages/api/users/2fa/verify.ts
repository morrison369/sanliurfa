/**
 * Verify 2FA setup and enable 2FA
 * POST /api/users/2fa/verify
 * Body: { code: string } - 6-digit TOTP code from authenticator app
 */

import type { APIRoute } from 'astro';
import { enableTwoFactor, generateBackupCodes, verifyTOTPCode } from '../../../../lib/two-factor';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../lib/api';
import { logger } from '../../../../lib/logging';
import { getCache, setCache, deleteCache } from '../../../../lib/cache';
import {
  deleteTwoFactorSetupSecret,
  getTwoFactorSetupSecret
} from '../../../../lib/two-factor-setup-store';

type VerifySetupBody = {
  code?: unknown;
};

const MAX_SETUP_ATTEMPTS = 5;
const SETUP_ATTEMPT_TTL = 300; // seconds — matches 2fa:setup secret TTL

export const POST: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId(request);
  logger.setRequestId(requestId);

  try {
    // Auth required
    if (!locals.user) {
      return apiError(ErrorCode.UNAUTHORIZED, 'Oturum gerekli', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const userId = locals.user.id;
    const body = (await request.json()) as VerifySetupBody;

    // Validate code format
    if (!body.code || typeof body.code !== 'string' || !/^\d{6}$/.test(body.code)) {
      return apiError(ErrorCode.VALIDATION_ERROR, 'Kod formatı geçersiz. Kod 6 haneli olmalı.', HttpStatus.BAD_REQUEST, undefined, requestId);
    }

    // Get the secret that was generated during setup (stored in cache)
    let secret: string | null = null;
    try {
      secret = await getCache<string>(`2fa:setup:${userId}`);
    } catch (cacheError) {
      secret = null;
    }
    if (!secret) {
      secret = getTwoFactorSetupSecret(userId);
    }

    if (!secret) {
      return apiError(ErrorCode.VALIDATION_ERROR, 'Önce 2FA kurulum adımını tamamlayın.', HttpStatus.BAD_REQUEST, undefined, requestId);
    }

    // Brute-force protection: max 5 failed attempts before invalidating setup
    const attemptKey = `2fa:setup:attempt:${userId}`;
    const attempts = Number(await getCache<string>(attemptKey).catch(() => null)) || 0;
    if (attempts >= MAX_SETUP_ATTEMPTS) {
      // Invalidate the pending setup secret — user must restart setup
      deleteTwoFactorSetupSecret(userId);
      await deleteCache(`2fa:setup:${userId}`).catch(() => null);
      await deleteCache(attemptKey).catch(() => null);
      return apiError(ErrorCode.RATE_LIMITED, '2FA kurulumu çok fazla hatalı deneme. Lütfen kurulumu yeniden başlatın.', HttpStatus.RATE_LIMITED, undefined, requestId);
    }

    // Verify the TOTP code against the secret
    const verified = verifyTOTPCode(secret, body.code);

    if (!verified) {
      await setCache(attemptKey, String(attempts + 1), SETUP_ATTEMPT_TTL).catch(() => null);
      return apiError(ErrorCode.UNAUTHORIZED, 'Doğrulama kodu geçersiz. Tekrar deneyin.', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    // Successful verification — clear attempt counter
    await deleteCache(attemptKey).catch(() => null);

    // Generate backup codes
    const backupCodes = generateBackupCodes(10);

    // Enable 2FA with the secret and backup codes
    const enableResult = await enableTwoFactor(userId, secret, backupCodes);

    if (!enableResult) {
      return apiError(ErrorCode.INTERNAL_ERROR, '2FA etkinleştirilemedi. Tekrar deneyin.', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
    }

    // Clean up the temporary setup secret from cache
    deleteTwoFactorSetupSecret(userId);
    try {
      await deleteCache(`2fa:setup:${userId}`);
    } catch (cacheError) {
      // cache cleanup is best-effort; in-memory cleanup already done above.
    }

    logger.info('2FA verified and enabled', { userId });

    return apiResponse({
      success: true,
      message: '2FA etkinleştirildi.',
      backupCodes,
      notice: 'Yedek kodları güvenli bir yerde saklayın. Doğrulama uygulamasına erişiminizi kaybederseniz hesabınızı kurtarmak için kullanabilirsiniz.',
    }, HttpStatus.OK, requestId);
  } catch (error) {
    logger.error('Failed to verify 2FA', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, '2FA doğrulanamadı', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
