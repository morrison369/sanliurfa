/**
 * User Activity Stats API
 * GET: Get user's activity statistics
 */

import type { APIRoute } from 'astro';
import { getUserActivitySummary } from '../../../../lib/analytics';
import { queryOne } from '../../../../lib/postgres';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../lib/api';
import { recordRequest } from '../../../../lib/metrics';
import { logger } from '../../../../lib/logging';

export const GET: APIRoute = async ({ request, params }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    const { id: userId } = params;

    // Verify user exists
    const user = await queryOne('SELECT id FROM users WHERE id = $1', [userId]);
    if (!user) {
      recordRequest('GET', `/api/users/${userId}/activity-stats`, HttpStatus.NOT_FOUND, Date.now() - startTime);
      return apiError(
        ErrorCode.NOT_FOUND,
        'Kullanıcı bulunamadı',
        HttpStatus.NOT_FOUND,
        undefined,
        requestId
      );
    }

    // Get activity stats
    const stats = await getUserActivitySummary(userId, 30);

    const duration = Date.now() - startTime;
    recordRequest('GET', `/api/users/${userId}/activity-stats`, HttpStatus.OK, duration);

    return apiResponse(
      {
        success: true,
        data: stats || { views: 0, searches: 0, reviews: 0, comments: 0, favorites: 0, total: 0 }
      },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', `/api/users/${params.id}/activity-stats`, HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Get activity stats failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'İstatistikler alınırken bir hata oluştu',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
