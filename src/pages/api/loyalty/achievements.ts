/**
 * Achievements Endpoint
 * GET: Retrieve user achievements (all, unviewed, or stats)
 * POST: Mark achievement as viewed
 */

import type { APIRoute } from 'astro';
import { getUserAchievements, getUnviewedAchievements, getAchievementStats, markAchievementViewed } from '../../../lib/achievements';
import { getCache, setCache } from '../../../lib/cache';
import { apiResponse, apiError } from '../../../lib/api';
import { logger } from '../../../lib/logging';
import { recordRequest } from '../../../lib/metrics';

export const GET: APIRoute = async ({ request, locals }) => {
  const startTime = Date.now();
  const requestId = request.headers.get('x-request-id') || crypto.randomUUID();

  try {
    // Auth required
    if (!locals.user) {
      const duration = Date.now() - startTime;
      recordRequest('GET', '/api/loyalty/achievements', 401, duration);
      return apiError('UNAUTHORIZED', 'Authentication required', 401, undefined, requestId);
    }

    const url = new URL(request.url);
    const view = url.searchParams.get('view') || 'all';
    const userId = locals.user.id;

    const data =
      view === 'unviewed'
        ? await getUnviewedAchievements(userId)
        : view === 'stats'
          ? await (async () => {
              const cacheKey = `achievements:stats:${userId}`;
              const cached = await getCache(cacheKey);
              if (cached) {
                return cached;
              }
              const stats = await getAchievementStats(userId);
              await setCache(cacheKey, stats, 300);
              return stats;
            })()
          : await getUserAchievements(userId);

    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/loyalty/achievements', 200, duration);

    return apiResponse({ success: true, data }, 200, requestId);
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/loyalty/achievements', 500, duration);
    logger.error('Failed to get achievements', error instanceof Error ? error : new Error(String(error)));
    return apiError('INTERNAL_ERROR', 'Failed to retrieve achievements', 500, undefined, requestId);
  }
};

export const POST: APIRoute = async ({ request, locals }) => {
  const startTime = Date.now();
  const requestId = request.headers.get('x-request-id') || crypto.randomUUID();

  try {
    // Auth required
    if (!locals.user) {
      const duration = Date.now() - startTime;
      recordRequest('POST', '/api/loyalty/achievements', 401, duration);
      return apiError('UNAUTHORIZED', 'Authentication required', 401, undefined, requestId);
    }

    const body = await request.json();
    const { userAchievementId } = body;

    // Validation
    if (!userAchievementId || typeof userAchievementId !== 'string') {
      const duration = Date.now() - startTime;
      recordRequest('POST', '/api/loyalty/achievements', 422, duration);
      return apiError('VALIDATION_ERROR', 'userAchievementId is required', 422, undefined, requestId);
    }

    // Mark as viewed
    await markAchievementViewed(userAchievementId, locals.user.id);

    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/loyalty/achievements', 200, duration);

    return apiResponse({ success: true }, 200, requestId);
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/loyalty/achievements', 500, duration);
    logger.error('Failed to mark achievement viewed', error instanceof Error ? error : new Error(String(error)));
    return apiError('INTERNAL_ERROR', 'Failed to update achievement', 500, undefined, requestId);
  }
};
