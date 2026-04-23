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
    // Oturum zorunlu
    if (!locals.user) {
      const duration = Date.now() - startTime;
      recordRequest('GET', '/api/loyalty/achievements', 401, duration);
      return apiError('UNAUTHORIZED', 'Oturum açmanız gerekiyor', 401, undefined, requestId);
    }

    const url = new URL(request.url);
    const view = url.searchParams.get('view') || 'all';
    const userId = locals.user.id;

    let data;

    switch (view) {
      case 'unviewed': {
        // Real-time unviewed achievements (no cache)
        data = await getUnviewedAchievements(userId);
        break;
      }

      case 'stats': {
        // Stats with caching (300s TTL)
        const cacheKey = `achievements:stats:${userId}`;
        const cached = await getCache(cacheKey);
        if (cached) {
          data = cached;
        } else {
          data = await getAchievementStats(userId);
          await setCache(cacheKey, data, 300);
        }
        break;
      }

      case 'all':
      default: {
        // All achievements (has internal caching: 1800s)
        data = await getUserAchievements(userId);
        break;
      }
    }

    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/loyalty/achievements', 200, duration);

    return apiResponse({ success: true, data }, 200, requestId);
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/loyalty/achievements', 500, duration);
    logger.error('Başarımlar alınamadı', error instanceof Error ? error : new Error(String(error)));
    return apiError('INTERNAL_ERROR', 'Başarımlar alınamadı', 500, undefined, requestId);
  }
};

export const POST: APIRoute = async ({ request, locals }) => {
  const startTime = Date.now();
  const requestId = request.headers.get('x-request-id') || crypto.randomUUID();

  try {
    // Oturum zorunlu
    if (!locals.user) {
      const duration = Date.now() - startTime;
      recordRequest('POST', '/api/loyalty/achievements', 401, duration);
      return apiError('UNAUTHORIZED', 'Oturum açmanız gerekiyor', 401, undefined, requestId);
    }

    const body = await request.json();
    const { userAchievementId } = body;

    // Validation
    if (!userAchievementId || typeof userAchievementId !== 'string') {
      const duration = Date.now() - startTime;
      recordRequest('POST', '/api/loyalty/achievements', 422, duration);
      return apiError('VALIDATION_ERROR', 'Başarım ID gereklidir', 422, undefined, requestId);
    }

    // Mark as viewed
    await markAchievementViewed(userAchievementId, locals.user.id);

    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/loyalty/achievements', 200, duration);

    return apiResponse({ success: true }, 200, requestId);
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/loyalty/achievements', 500, duration);
    logger.error('Başarım görüntülendi olarak işaretlenemedi', error instanceof Error ? error : new Error(String(error)));
    return apiError('INTERNAL_ERROR', 'Başarım güncellenemedi', 500, undefined, requestId);
  }
};
