/**
 * Request account deletion
 * POST /api/users/deletion/request
 * Body: { password: string, reason?: string }
 */

import type { APIRoute } from 'astro';
import { queryOne } from '../../../../lib/postgres';
import { requestAccountDeletion } from '../../../../lib/account/account-deletion';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../lib/api';
import { logger } from '../../../../lib/logging';
import bcryptjs from 'bcryptjs';

type DeleteAccountBody = {
  password?: unknown;
  reason?: unknown;
};

type UserPasswordRow = {
  password_hash: string | null;
};

export const POST: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId(request);

  try {
    // Auth required
    if (!locals.user) {
      return apiError(
        ErrorCode.UNAUTHORIZED,
        'Oturum açmanız gerekiyor',
        HttpStatus.UNAUTHORIZED,
        undefined,
        requestId
      );
    }

    const userId = locals.user.id;
    const body = await request.json() as DeleteAccountBody;

    // Validate password is provided
    if (!body.password || typeof body.password !== 'string') {
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Şifre gereklidir',
        HttpStatus.BAD_REQUEST,
        undefined,
        requestId
      );
    }

    // Get user with password hash
    const user = await queryOne<UserPasswordRow>(
      'SELECT password_hash FROM users WHERE id = $1',
      [userId]
    );

    if (!user?.password_hash) {
      return apiError(
        ErrorCode.NOT_FOUND,
        'Kullanıcı bulunamadı veya şifreyle giriş etkin değil',
        HttpStatus.NOT_FOUND,
        undefined,
        requestId
      );
    }

    // Verify password
    const isPasswordValid = await bcryptjs.compare(body.password, user.password_hash);

    if (!isPasswordValid) {
      logger.warn('Invalid password for account deletion request', { userId });
      return apiError(
        ErrorCode.AUTHENTICATION_FAILED,
        'Şifre hatalı',
        HttpStatus.UNAUTHORIZED,
        undefined,
        requestId
      );
    }

    // Request deletion
    const reason = typeof body.reason === 'string' && body.reason.trim().length > 0
      ? body.reason.trim()
      : undefined;
    const deletion = await requestAccountDeletion(userId, reason);

    logger.info('Account deletion requested', { userId, deletesAt: deletion.deletesAt });

    return apiResponse({
      success: true,
      message: `Hesabınız ${deletion.gracePeriodDays} gün içinde silinecektir.`,
      deletionRequestId: deletion.deletionRequestId,
      deletesAt: deletion.deletesAt,
      gracePeriodDays: deletion.gracePeriodDays,
      notice: 'Bu süre içinde silinme işlemini iptal edebilirsiniz.'
    }, HttpStatus.OK, requestId);
  } catch (error) {
    logger.error('Failed to request account deletion', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Hesap silme isteği oluşturulurken bir hata oluştu',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
