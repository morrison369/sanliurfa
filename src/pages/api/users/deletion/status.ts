/**
 * Check account deletion status
 * GET /api/users/deletion/status
 */

import type { APIRoute } from 'astro';
import { getDeletionStatus } from '../../../../lib/account-deletion';
import { apiResponse, apiError, HttpStatus } from '../../../../lib/api';
import { logger } from '../../../../lib/logging';

export const GET: APIRoute = async (context) => {
  try {
    // Auth required
    if (!context.locals.user) {
      return apiError(context, HttpStatus.UNAUTHORIZED, 'Authentication required');
    }

    const userId = context.locals.user.id;

    // Get deletion status
    const status = await getDeletionStatus(userId);

    return apiResponse(context, HttpStatus.OK, {
      success: true,
      hasPendingDeletion: status?.hasPendingDeletion || false,
      deletesAt: status?.deletesAt || null,
      gracePeriodDaysRemaining: status?.gracePeriodDaysRemaining || null
    });
  } catch (error) {
    logger.error('Failed to get deletion status', error instanceof Error ? error : new Error(String(error)));
    return apiError(context, HttpStatus.INTERNAL_SERVER_ERROR, 'Failed to get deletion status');
  }
};
