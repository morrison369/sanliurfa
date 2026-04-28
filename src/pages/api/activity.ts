/**
 * User Activity API
 * Retrieve activity feed for user profiles
 */

import type { APIRoute } from 'astro';
import { getUserActivity } from '../../lib/activity';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId, safeIntParam } from '../../lib/api';
import { recordRequest } from '../../lib/metrics';
import { logger } from '../../lib/logging';

export const GET: APIRoute = async ({ request, locals, url }) => {
  const requestId = getRequestId(request);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    // Get userId from query or use authenticated user
    const userIdParam = url.searchParams.get('userId');
    const limit = safeIntParam(url.searchParams.get('limit'), 20, 0, 1_000_000);

    if (!locals.user) {
      recordRequest('GET', '/api/activity', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(ErrorCode.UNAUTHORIZED, 'Oturum açmanız gerekiyor', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    // IDOR guard: only admins can request another user's activity
    if (userIdParam && userIdParam !== String(locals.user.id) && !locals.isAdmin) {
      recordRequest('GET', '/api/activity', HttpStatus.FORBIDDEN, Date.now() - startTime);
      return apiError(ErrorCode.FORBIDDEN, 'Bu aktiviteye erişim izniniz yok', HttpStatus.FORBIDDEN, undefined, requestId);
    }

    const userId = userIdParam || locals.user.id;

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

