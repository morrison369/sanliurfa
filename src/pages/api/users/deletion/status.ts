/**
 * Check account deletion status
 * GET /api/users/deletion/status
 */

import type { APIRoute } from 'astro';
import { getDeletionStatus } from '../../../../lib/account/account-deletion';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../lib/api';
import { logger } from '../../../../lib/logging';

export const GET: APIRoute = async ({ request, locals }) => {
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

    // Get deletion status
    const status = await getDeletionStatus(userId);

    return apiResponse({
      success: true,
      hasPendingDeletion: status?.hasPendingDeletion || false,
      deletesAt: status?.deletesAt || null,
      gracePeriodDaysRemaining: status?.gracePeriodDaysRemaining || null
    }, HttpStatus.OK, requestId);
  } catch (error) {
    logger.error('Failed to get deletion status', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Hesap silme durumu alınırken bir hata oluştu',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
