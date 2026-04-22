/**
 * Verify 2FA setup and enable 2FA
 * POST /api/users/2fa/verify
 * Body: { code: string } - 6-digit TOTP code from authenticator app
 */

import type { APIRoute } from 'astro';
import { verify2FACode, enableTwoFactor, generateBackupCodes, verifyTOTPCode } from '../../../../lib/two-factor';
import { queryOne } from '../../../../lib/postgres';
import { apiResponse, apiError, HttpStatus } from '../../../../lib/api';
import { logger } from '../../../../lib/logging';
import { getCache, deleteCache } from '../../../../lib/cache';

export const POST: APIRoute = async (context) => {
  try {
    // Oturum zorunlu
    if (!context.locals.user) {
      return apiError(context, HttpStatus.UNAUTHORIZED, 'Oturum açmanız gerekiyor');
    }

    const userId = context.locals.user.id;
    const body = await context.request.json();

    // Validate code format
    if (!body.code || typeof body.code !== 'string' || !/^\d{6}$/.test(body.code)) {
      return apiError(context, HttpStatus.BAD_REQUEST, 'Kod formatı geçersiz. Kod 6 haneli olmalıdır.');
    }

    // Get the secret that was generated during setup (stored in cache)
    const secret = await getCache<string>(`sanliurfa:2fa:setup:${userId}`);

    if (!secret) {
      return apiError(context, HttpStatus.BAD_REQUEST, 'Önce 2FA kurulum adımını tamamlayın.');
    }

    // Verify the TOTP code against the secret
    const verified = verifyTOTPCode(secret, body.code);

    if (!verified) {
      return apiError(context, HttpStatus.UNAUTHORIZED, 'Doğrulama kodu geçersiz. Lütfen tekrar deneyin.');
    }

    // Generate backup codes
    const backupCodes = generateBackupCodes(10);

    // Enable 2FA with the secret and backup codes
    const enableResult = await enableTwoFactor(userId, secret, backupCodes);

    if (!enableResult) {
      return apiError(context, HttpStatus.INTERNAL_SERVER_ERROR, '2FA etkinleştirilemedi. Lütfen tekrar deneyin.');
    }

    // Clean up the temporary setup secret from cache
    await deleteCache(`sanliurfa:2fa:setup:${userId}`);

    logger.info('2FA verified and enabled', { userId });

    return apiResponse(context, HttpStatus.OK, {
      success: true,
      message: '2FA başarıyla etkinleştirildi.',
      backupCodes,
      notice: 'Bu yedek kodları güvenli bir yerde saklayın. Doğrulama uygulamasına erişiminizi kaybederseniz hesabınızı kurtarmak için kullanabilirsiniz.'
    });
  } catch (error) {
    logger.error('2FA doğrulanamadı', error instanceof Error ? error : new Error(String(error)));
    return apiError(context, HttpStatus.INTERNAL_SERVER_ERROR, '2FA doğrulanamadı');
  }
};
