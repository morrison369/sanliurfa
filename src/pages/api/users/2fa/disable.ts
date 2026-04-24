/**
 * Disable 2FA
 * POST /api/users/2fa/disable
 * Body: { password: string } - Current password for verification
 */

import type { APIRoute } from 'astro';
import { disableTwoFactor } from '../../../../lib/two-factor';
import { queryOne } from '../../../../lib/postgres';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../lib/api';
import { logger } from '../../../../lib/logging';
import bcryptjs from 'bcryptjs';

type DisableBody = {
  password?: unknown;
};

type PasswordRow = {
  password_hash: string | null;
};

export const POST: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId(request);
  logger.setRequestId(requestId);

  try {
    // Auth required
    if (!locals.user) {
      return apiError(ErrorCode.UNAUTHORIZED, 'Oturum gerekli', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const userId = locals.user.id;
    const body = (await request.json()) as DisableBody;

    // Validate password is provided
    if (!body.password || typeof body.password !== 'string') {
      return apiError(ErrorCode.VALIDATION_ERROR, 'Şifre gerekli', HttpStatus.BAD_REQUEST, undefined, requestId);
    }

    // Get user with password hash
    const user = await queryOne<PasswordRow>(
      'SELECT password_hash FROM users WHERE id = $1',
      [userId]
    );

    if (!user || !user.password_hash) {
      return apiError(ErrorCode.NOT_FOUND, 'Kullanıcı bulunamadı', HttpStatus.NOT_FOUND, undefined, requestId);
    }

    // Verify password
    const isPasswordValid = await bcryptjs.compare(body.password, user.password_hash);

    if (!isPasswordValid) {
      logger.warn('Invalid password for 2FA disable', { userId });
      return apiError(ErrorCode.UNAUTHORIZED, 'Şifre geçersiz', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    // Disable 2FA
    await disableTwoFactor(userId);

    logger.info('2FA disabled', { userId });

    return apiResponse({
      success: true,
      message: '2FA devre dışı bırakıldı',
    }, HttpStatus.OK, requestId);
  } catch (error) {
    logger.error('Failed to disable 2FA', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, '2FA devre dışı bırakılamadı', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
