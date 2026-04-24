/**
 * Check 2FA status
 * GET /api/users/2fa/status
 */

import type { APIRoute } from 'astro';
import { queryOne } from '../../../../lib/postgres';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../lib/api';
import { logger } from '../../../../lib/logging';

type TwoFactorStatusRow = {
  two_factor_enabled?: boolean | null;
  two_factor_backup_codes?: string[] | null;
};

export const GET: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId(request);
  logger.setRequestId(requestId);

  try {
    // Auth required
    if (!locals.user) {
      return apiError(ErrorCode.UNAUTHORIZED, 'Oturum gerekli', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const userId = locals.user.id;

    // Check if 2FA is enabled
    const user = await queryOne<TwoFactorStatusRow>(
      'SELECT two_factor_enabled, two_factor_backup_codes FROM users WHERE id = $1',
      [userId]
    );

    if (!user) {
      return apiError(ErrorCode.NOT_FOUND, 'Kullanıcı bulunamadı', HttpStatus.NOT_FOUND, undefined, requestId);
    }

    const backupCodesRemaining = user.two_factor_backup_codes?.length || 0;

    return apiResponse({
      success: true,
      twoFactorEnabled: user.two_factor_enabled,
      backupCodesRemaining,
    }, HttpStatus.OK, requestId);
  } catch (error) {
    logger.error('Failed to check 2FA status', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, '2FA durumu kontrol edilemedi', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
