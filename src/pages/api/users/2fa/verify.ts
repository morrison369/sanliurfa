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
    // Auth required
    if (!context.locals.user) {
      return apiError(context, HttpStatus.UNAUTHORIZED, 'Authentication required');
    }

    const userId = context.locals.user.id;
    const body = await context.request.json();

    // Validate code format
    if (!body.code || typeof body.code !== 'string' || !/^\d{6}$/.test(body.code)) {
      return apiError(context, HttpStatus.BAD_REQUEST, 'Invalid code format. Code must be 6 digits.');
    }

    // Get the secret that was generated during setup (stored in cache)
    const secret = await getCache<string>(`sanliurfa:2fa:setup:${userId}`);

    if (!secret) {
      return apiError(context, HttpStatus.BAD_REQUEST, 'Please complete the setup step first. Call POST /api/users/2fa/setup to get started.');
    }

    // Verify the TOTP code against the secret
    const verified = verifyTOTPCode(secret, body.code);

    if (!verified) {
      return apiError(context, HttpStatus.UNAUTHORIZED, 'Invalid verification code. Please try again.');
    }

    // Generate backup codes
    const backupCodes = generateBackupCodes(10);

    // Enable 2FA with the secret and backup codes
    const enableResult = await enableTwoFactor(userId, secret, backupCodes);

    if (!enableResult) {
      return apiError(context, HttpStatus.INTERNAL_SERVER_ERROR, 'Failed to enable 2FA. Please try again.');
    }

    // Clean up the temporary setup secret from cache
    await deleteCache(`sanliurfa:2fa:setup:${userId}`);

    logger.info('2FA verified and enabled', { userId });

    return apiResponse(context, HttpStatus.OK, {
      success: true,
      message: '2FA successfully enabled!',
      backupCodes,
      notice: 'Save these backup codes in a secure location. You can use them to recover your account if you lose access to your authenticator app.'
    });
  } catch (error) {
    logger.error('Failed to verify 2FA', error instanceof Error ? error : new Error(String(error)));
    return apiError(context, HttpStatus.INTERNAL_SERVER_ERROR, 'Failed to verify 2FA');
  }
};
