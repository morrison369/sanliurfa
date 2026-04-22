/**
 * Disable 2FA
 * POST /api/users/2fa/disable
 * Body: { password: string } - Current password for verification
 */

import type { APIRoute } from 'astro';
import { disableTwoFactor } from '../../../../lib/two-factor';
import { queryOne } from '../../../../lib/postgres';
import { apiResponse, apiError, HttpStatus } from '../../../../lib/api';
import { logger } from '../../../../lib/logging';
import bcryptjs from 'bcryptjs';

export const POST: APIRoute = async (context) => {
  try {
    // Oturum zorunlu
    if (!context.locals.user) {
      return apiError(context, HttpStatus.UNAUTHORIZED, 'Oturum açmanız gerekiyor');
    }

    const userId = context.locals.user.id;
    const body = await context.request.json();

    // Validate password is provided
    if (!body.password || typeof body.password !== 'string') {
      return apiError(context, HttpStatus.BAD_REQUEST, 'Şifre gereklidir');
    }

    // Get user with password hash
    const user = await queryOne(
      'SELECT password FROM users WHERE id = $1',
      [userId]
    );

    if (!user) {
      return apiError(context, HttpStatus.NOT_FOUND, 'Kullanıcı bulunamadı');
    }

    // Verify password
    const isPasswordValid = await bcryptjs.compare(body.password, user.password);

    if (!isPasswordValid) {
      logger.warn('Invalid password for 2FA disable', { userId });
      return apiError(context, HttpStatus.UNAUTHORIZED, 'Şifre hatalı');
    }

    // Disable 2FA
    await disableTwoFactor(userId);

    logger.info('2FA disabled', { userId });

    return apiResponse(context, HttpStatus.OK, {
      success: true,
      message: '2FA başarıyla devre dışı bırakıldı'
    });
  } catch (error) {
    logger.error('2FA devre dışı bırakılamadı', error instanceof Error ? error : new Error(String(error)));
    return apiError(context, HttpStatus.INTERNAL_SERVER_ERROR, '2FA devre dışı bırakılamadı');
  }
};
