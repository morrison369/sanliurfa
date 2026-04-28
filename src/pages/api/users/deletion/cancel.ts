/**
 * Cancel account deletion request
 * POST /api/users/deletion/cancel
 */

import type { APIRoute } from 'astro';
import { cancelAccountDeletion } from '../../../../lib/account/account-deletion';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../lib/api';
import { logger } from '../../../../lib/logging';

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

    // Cancel deletion
    const cancelled = await cancelAccountDeletion(userId);

    if (!cancelled) {
      return apiError(
        ErrorCode.NOT_FOUND,
        'Bekleyen hesap silme isteği bulunamadı',
        HttpStatus.NOT_FOUND,
        undefined,
        requestId
      );
    }

    logger.info('Account deletion cancelled', { userId });

    return apiResponse({
      success: true,
      message: 'Hesap silme işlemi iptal edildi'
    }, HttpStatus.OK, requestId);
  } catch (error) {
    logger.error('Failed to cancel account deletion', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Hesap silme iptal edilirken bir hata oluştu',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
