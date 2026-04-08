/**
 * Loyalty Achievements API
 * Get and manage user achievements
 */

import type { APIRoute } from 'astro';
import {
  getUserAchievements,
  getUnviewedAchievements,
  getAchievementStats,
  markAchievementViewed
} from '../../../lib/achievements';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { recordRequest } from '../../../lib/metrics';
import { getCache, setCache } from '../../../lib/cache';
import { logger } from '../../../lib/logging';

export const GET: APIRoute = async ({ request, url, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    // Auth required
    if (!locals.user?.id) {
      recordRequest('GET', '/api/loyalty/achievements', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(
        ErrorCode.AUTH_REQUIRED,
        'Authentication required',
        HttpStatus.UNAUTHORIZED,
        undefined,
        requestId
      );
    }

    const view = url.searchParams.get('view') || 'all';
    const userId = locals.user.id;
    let data;

    // Route based on view parameter
    if (view === 'unviewed') {
      // Real-time unviewed count — no cache
      data = await getUnviewedAchievements(userId);
    } else if (view === 'stats') {
      // Stats with caching
      const cacheKey = `sanliurfa:achievements:stats:${userId}`;
      const cached = await getCache(cacheKey);
      if (cached) {
        const duration = Date.now() - startTime;
        recordRequest('GET', '/api/loyalty/achievements', HttpStatus.OK, duration);
        return apiResponse(
          { success: true, data: JSON.parse(cached), view },
          HttpStatus.OK,
          requestId
        );
      }

      data = await getAchievementStats(userId);
      await setCache(cacheKey, JSON.stringify(data), 300);
    } else {
      // 'all' — calls internal cached function
      data = await getUserAchievements(userId);
    }

    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/loyalty/achievements', HttpStatus.OK, duration);

    return apiResponse(
      { success: true, data, view },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/loyalty/achievements', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error(
      'Failed to get achievements',
      error instanceof Error ? error : new Error(String(error))
    );
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to get achievements',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};

export const POST: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    // Auth required
    if (!locals.user?.id) {
      recordRequest('POST', '/api/loyalty/achievements', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(
        ErrorCode.AUTH_REQUIRED,
        'Authentication required',
        HttpStatus.UNAUTHORIZED,
        undefined,
        requestId
      );
    }

    // Parse body
    const body = await request.json();
    const { userAchievementId } = body;

    // Validation
    if (!userAchievementId) {
      recordRequest('POST', '/api/loyalty/achievements', HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'userAchievementId is required',
        HttpStatus.UNPROCESSABLE_ENTITY,
        undefined,
        requestId
      );
    }

    // Mark as viewed
    await markAchievementViewed(userAchievementId, locals.user.id);

    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/loyalty/achievements', HttpStatus.OK, duration);
    logger.logMutation('mark_viewed', 'user_achievements', userAchievementId, locals.user.id);

    return apiResponse(
      { success: true },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/loyalty/achievements', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error(
      'Failed to mark achievement as viewed',
      error instanceof Error ? error : new Error(String(error))
    );
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to update achievement',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
