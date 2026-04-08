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
    // Auth required
    if (!context.locals.user) {
      return apiError(context, HttpStatus.UNAUTHORIZED, 'Authentication required');
    }

    const userId = context.locals.user.id;
    const email = context.locals.user.email;

    // Generate 2FA secret
    const setupResult = await setupTwoFactor(userId);
    if (!setupResult) {
      return apiError(context, HttpStatus.INTERNAL_SERVER_ERROR, 'Failed to generate 2FA secret');
    }
    const { secret, qrCodeUrl, backupCodes } = setupResult;

    // Store secret temporarily in cache (10 minute expiration for setup verification)
    await setCache(`sanliurfa:2fa:setup:${userId}`, secret, 600);

    logger.info('2FA setup initiated', { userId });

    return apiResponse(context, HttpStatus.OK, {
      success: true,
      message: '2FA setup initiated. Scan QR code with authenticator app.',
      secret,
      qrCodeUrl,
      backupCodes
    });
  } catch (error) {
    logger.error('Failed to setup 2FA', error instanceof Error ? error : new Error(String(error)));
    return apiError(context, HttpStatus.INTERNAL_SERVER_ERROR, 'Failed to setup 2FA');
  }
};
