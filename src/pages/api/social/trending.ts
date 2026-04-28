import type { APIRoute } from 'astro';
import { getTrendingHashtags, getTrendingPlaces } from '../../../lib/social/social-features';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId, safeIntParam } from '../../../lib/api';
import { logger } from '../../../lib/logging';

export const GET: APIRoute = async ({ request, url }) => {
  const requestId = getRequestId(request);
  logger.setRequestId(requestId);

  try {
    const VALID_TRENDING_TYPES = new Set(['hashtags', 'places']);
    const rawType = url.searchParams.get('type') || 'hashtags';
    const type = VALID_TRENDING_TYPES.has(rawType) ? rawType : 'hashtags';
    const limit = safeIntParam(url.searchParams.get('limit'), 20, 0, 1_000_000);
    const VALID_PERIODS = new Set(['hour', 'day', 'week', 'month', 'year']);
    const rawPeriod = url.searchParams.get('period') || 'day';
    const period = VALID_PERIODS.has(rawPeriod) ? rawPeriod : 'day';

    const data =
      type === 'hashtags'
        ? await getTrendingHashtags(limit, period)
        : await getTrendingPlaces(limit, period);

    return apiResponse({ success: true, data }, HttpStatus.OK, requestId);
  } catch (error) {
    logger.error('Failed to get trending', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Internal server error', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
