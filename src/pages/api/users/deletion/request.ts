/**
 * Request account deletion
 * POST /api/users/deletion/request
 * Body: { password: string, reason?: string }
 */

import type { APIRoute } from 'astro';
import { queryOne } from '../../../../lib/postgres';
import { requestAccountDeletion } from '../../../../lib/account-deletion';
import { apiResponse, apiError, HttpStatus } from '../../../../lib/api';
import { logger } from '../../../../lib/logging';
import bcryptjs from 'bcryptjs';

export const POST: APIRoute = async (context) => {
  try {
    // Auth required
    if (!context.locals.user) {
      return apiError(context, HttpStatus.UNAUTHORIZED, 'Authentication required');
    }

    const userId = context.locals.user.id;
    const body = await context.request.json();

    // Validate password is provided
    if (!body.password || typeof body.password !== 'string') {
      return apiError(context, HttpStatus.BAD_REQUEST, 'Password is required');
    }

    // Get user with password hash
    const user = await queryOne(
      'SELECT password FROM users WHERE id = $1',
      [userId]
    );

    if (!user) {
      return apiError(context, HttpStatus.NOT_FOUND, 'User not found');
    }

    // Verify password
    const isPasswordValid = await bcryptjs.compare(body.password, user.password);

    if (!isPasswordValid) {
      logger.warn('Invalid password for account deletion request', { userId });
      return apiError(context, HttpStatus.UNAUTHORIZED, 'Invalid password');
    }

    // Request deletion
    const deletion = await requestAccountDeletion(userId, body.reason || undefined);

    logger.info('Account deletion requested', { userId, deletesAt: deletion.deletesAt });

    return apiResponse(context, HttpStatus.OK, {
      success: true,
      message: `Hesabınız ${deletion.gracePeriodDays} gün içinde silinecektir.`,
      deletionRequestId: deletion.deletionRequestId,
      deletesAt: deletion.deletesAt,
      gracePeriodDays: deletion.gracePeriodDays,
      notice: 'Bu süre içinde silinme işlemini iptal edebilirsiniz.'
    });
  } catch (error) {
    logger.error('Failed to request account deletion', error instanceof Error ? error : new Error(String(error)));
    return apiError(context, HttpStatus.INTERNAL_SERVER_ERROR, 'Failed to request account deletion');
  }
};
