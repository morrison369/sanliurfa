/**
 * Cancel account deletion request
 * POST /api/users/deletion/cancel
 */

import type { APIRoute } from 'astro';
import { cancelAccountDeletion } from '../../../../lib/account-deletion';
import { apiResponse, apiError, HttpStatus } from '../../../../lib/api';
import { logger } from '../../../../lib/logging';

export const POST: APIRoute = async (context) => {
  try {
    // Auth required
    if (!context.locals.user) {
      return apiError(context, HttpStatus.UNAUTHORIZED, 'Authentication required');
    }

    const userId = context.locals.user.id;

    // Cancel deletion
    const cancelled = await cancelAccountDeletion(userId);

    if (!cancelled) {
      return apiError(context, HttpStatus.NOT_FOUND, 'No pending deletion request found');
    }

    logger.info('Account deletion cancelled', { userId });

    return apiResponse(context, HttpStatus.OK, {
      success: true,
      message: 'Hesap silme işlemi iptal edildi'
    });
  } catch (error) {
    logger.error('Failed to cancel account deletion', error instanceof Error ? error : new Error(String(error)));
    return apiError(context, HttpStatus.INTERNAL_SERVER_ERROR, 'Failed to cancel account deletion');
  }
};
