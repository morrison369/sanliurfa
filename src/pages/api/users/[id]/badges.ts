import type { APIRoute } from 'astro';
import { getUserBadges, getBadgeProgress } from '../../../../lib/badges';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../lib/api';
import { recordRequest } from '../../../../lib/metrics';
import { logger } from '../../../../lib/logging';

export const GET: APIRoute = async ({ request, params }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    const userId = params.id;
    if (!userId) {
      recordRequest('GET', '/api/users/[id]/badges', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Kullanıcı ID gereklidir',
        HttpStatus.BAD_REQUEST,
        undefined,
        requestId
      );
    }

    const badges = await getUserBadges(userId);
    const progress = await getBadgeProgress(userId);

    const duration = Date.now() - startTime;
    recordRequest('GET', `/api/users/${userId}/badges`, HttpStatus.OK, duration);

    return apiResponse(
      {
        success: true,
        data: {
          badges: badges,
          progress: progress,
          count: badges.length
        }
      },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', `/api/users/${params.id}/badges`, HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Get badges failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Rozetler alınırken hata oluştu',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
