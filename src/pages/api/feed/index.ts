import type { APIRoute } from 'astro';
import { getPersonalizedFeed } from '../../../lib/feed';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId, safeIntParam } from '../../../lib/api';
import { recordRequest } from '../../../lib/metrics';
import { logger } from '../../../lib/logging';

export const GET: APIRoute = async ({ request, locals, url }) => {
  const requestId = getRequestId(request);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    const user = locals.user;
    if (!user) {
      recordRequest('GET', '/api/feed', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(ErrorCode.UNAUTHORIZED, 'Oturum açmanız gerekiyor', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const rawFeedType = url.searchParams.get('type') || 'following';
    const VALID_FEED_TYPES = new Set(['following', 'trending', 'recommended', 'nearby', 'discover']);
    const feedType = VALID_FEED_TYPES.has(rawFeedType) ? rawFeedType : 'following';
    const limit = safeIntParam(url.searchParams.get('limit'), 50, 1, 100);

    const feed = await getPersonalizedFeed(user.id, feedType, limit);

    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/feed', HttpStatus.OK, duration);

    return apiResponse(
      {
        success: true,
        data: feed,
        count: feed.length,
        type: feedType
      },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/feed', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Get feed failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Feed alınırken hata oluştu',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
