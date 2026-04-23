/**
 * Initiate 2FA setup
 * POST /api/users/2fa/setup
 * Returns secret and QR code URL for scanning with authenticator app
 */

import type { APIRoute } from 'astro';
import { setupTwoFactor } from '../../../../lib/two-factor';
import { apiResponse, apiError, HttpStatus } from '../../../../lib/api';
import { logger } from '../../../../lib/logging';
import { setCache } from '../../../../lib/cache';

export const POST: APIRoute = async (context) => {
  try {
    // Oturum zorunlu
    if (!context.locals.user) {
      return apiError(context, HttpStatus.UNAUTHORIZED, 'Oturum açmanız gerekiyor');
    }

    const userId = context.locals.user.id;
    const email = context.locals.user.email;

    // Generate 2FA secret
    const setupResult = await setupTwoFactor(userId);
    if (!setupResult) {
      return apiError(context, HttpStatus.INTERNAL_SERVER_ERROR, '2FA gizli anahtarı oluşturulamadı');
    }
    const { secret, qrCodeUrl, backupCodes } = setupResult;

    // Store secret temporarily in cache (10 minute expiration for setup verification)
    await setCache(`2fa:setup:${userId}`, secret, 600);

    logger.info('2FA setup initiated', { userId });

    return apiResponse(context, HttpStatus.OK, {
      success: true,
      message: '2FA kurulumu başlatıldı. QR kodunu doğrulama uygulamasıyla tarayın.',
      secret,
      qrCodeUrl,
      backupCodes
    });
  } catch (error) {
    logger.error('2FA kurulumu başlatılamadı', error instanceof Error ? error : new Error(String(error)));
    return apiError(context, HttpStatus.INTERNAL_SERVER_ERROR, '2FA kurulumu başlatılamadı');
  }
};
