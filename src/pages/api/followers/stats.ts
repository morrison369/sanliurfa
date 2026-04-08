/**
 * Followers Stats API
 * GET: Get follower statistics for a user
 */

import type { APIRoute } from 'astro';
import { getFollowerStats } from '../../../lib/followers';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { recordRequest } from '../../../lib/metrics';
import { logger } from '../../../lib/logging';
import { getCache, setCache } from '../../../lib/cache';

export const GET: APIRoute = async ({ request, url, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    // Get query parameters
    const userId = url.searchParams.get('userId');

    // Validate parameters
    if (!userId) {
      recordRequest('GET', '/api/followers/stats', HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Kullanıcı ID gereklidir',
        HttpStatus.UNPROCESSABLE_ENTITY,
        undefined,
        requestId
      );
    }

    // Check cache
    const cacheKey = `sanliurfa:follower-stats:${userId}:${locals.user?.id || 'anonymous'}`;
    const cached = await getCache<any>(cacheKey);

    if (cached) {
      const duration = Date.now() - startTime;
      recordRequest('GET', '/api/followers/stats', HttpStatus.OK, duration);
      return apiResponse(
        {
          success: true,
          data: cached
        },
        HttpStatus.OK,
        requestId,
        { 'X-Cache': 'HIT' }
      );
    }

    // Get stats
    const stats = await getFollowerStats(userId, locals.user?.id);

    // Cache for 2 minutes
    await setCache(cacheKey, stats, 120);

    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/followers/stats', HttpStatus.OK, duration);

    return apiResponse(
      {
        success: true,
        data: stats
      },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/followers/stats', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Get follower stats failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Takipçi istatistikleri alınırken bir hata oluştu',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
