/**
 * User Activity API
 * Retrieve activity feed for user profiles
 */

import type { APIRoute } from 'astro';
import { getUserActivity } from '../../lib/activity';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../lib/api';
import { recordRequest } from '../../lib/metrics';
import { logger } from '../../lib/logging';

export const GET: APIRoute = async ({ request, locals, url }) => {
  const requestId = getRequestId(request);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    // Get userId from query or use authenticated user
    const userIdParam = url.searchParams.get('userId');
    const limit = parseInt(url.searchParams.get('limit') || '20');

    const userId = userIdParam || locals.user?.id;

    // Require authentication if accessing someone else's activity
    if (!userId) {
      recordRequest('GET', '/api/activity', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(
        ErrorCode.UNAUTHORIZED,
        'Oturum açmanız gerekiyor',
        HttpStatus.UNAUTHORIZED,
        undefined,
        requestId
      );
    }

    // Get activity
    const activity = await getUserActivity(userId, { limit });

    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/activity', HttpStatus.OK, duration);

    return apiResponse(
      { success: true, data: activity.activities, count: activity.total },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/activity', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Get activity failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'İç sunucu hatası',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};

