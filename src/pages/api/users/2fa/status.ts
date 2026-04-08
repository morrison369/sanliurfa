/**
 * Check 2FA status
 * GET /api/users/2fa/status
 */

import type { APIRoute } from 'astro';
import { queryOne } from '../../../../lib/postgres';
import { apiResponse, apiError, HttpStatus } from '../../../../lib/api';
import { logger } from '../../../../lib/logging';

export const GET: APIRoute = async (context) => {
  try {
    // Auth required
    if (!context.locals.user) {
      return apiError(context, HttpStatus.UNAUTHORIZED, 'Authentication required');
    }

    const userId = context.locals.user.id;

    // Check if 2FA is enabled
    const user = await queryOne(
      'SELECT two_factor_enabled, two_factor_backup_codes FROM users WHERE id = $1',
      [userId]
    );

    if (!user) {
      return apiError(context, HttpStatus.NOT_FOUND, 'User not found');
    }

    const backupCodesRemaining = user.two_factor_backup_codes?.length || 0;

    return apiResponse(context, HttpStatus.OK, {
      success: true,
      twoFactorEnabled: user.two_factor_enabled,
      backupCodesRemaining
    });
  } catch (error) {
    logger.error('Failed to check 2FA status', error instanceof Error ? error : new Error(String(error)));
    return apiError(context, HttpStatus.INTERNAL_SERVER_ERROR, 'Failed to check 2FA status');
  }
};
