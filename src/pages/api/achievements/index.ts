/**
 * Achievements API
 * GET: List achievements and user progress
 */

import type { APIRoute } from 'astro';
import {
  getAllAchievements,
  getUserAchievements,
  getAchievementStats,
  getUnviewedAchievements,
  markAchievementViewed
} from '../../../lib/achievements';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { recordRequest } from '../../../lib/metrics';
import { logger } from '../../../lib/logging';

export const GET: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    const url = new URL(request.url);
    const all = url.searchParams.get('all') === 'true';
    const unviewed = url.searchParams.get('unviewed') === 'true';
    const stats = url.searchParams.get('stats') === 'true';

    const data: any = {};

    if (!locals.user?.id && !all) {
      recordRequest('GET', '/api/achievements', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(ErrorCode.AUTH_REQUIRED, 'Authentication required', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    if (all) {
      data.achievements = await getAllAchievements();
    }

    if (locals.user?.id) {
      if (unviewed) {
        data.unviewed = await getUnviewedAchievements(locals.user.id);
      } else {
        data.user_achievements = await getUserAchievements(locals.user.id);
      }

      if (stats) {
        data.stats = await getAchievementStats(locals.user.id);
      }
    }

    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/achievements', HttpStatus.OK, duration);

    return apiResponse(
      { success: true, data },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/achievements', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Get achievements failed', error instanceof Error ? error : new Error(String(error)));
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
    if (!locals.user?.id) {
      recordRequest('POST', '/api/achievements', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(ErrorCode.AUTH_REQUIRED, 'Authentication required', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const body = await request.json();
    const { achievement_id, action } = body;

    if (action === 'view' && achievement_id) {
      await markAchievementViewed(achievement_id, locals.user.id);

      const duration = Date.now() - startTime;
      recordRequest('POST', '/api/achievements', HttpStatus.OK, duration);

      return apiResponse(
        { success: true, message: 'Achievement marked as viewed' },
        HttpStatus.OK,
        requestId
      );
    }

    recordRequest('POST', '/api/achievements', HttpStatus.BAD_REQUEST, Date.now() - startTime);
    return apiError(
      ErrorCode.VALIDATION_ERROR,
      'Invalid action',
      HttpStatus.BAD_REQUEST,
      undefined,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/achievements', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Achievement action failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to process achievement action',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
