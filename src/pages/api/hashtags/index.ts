/**
 * Hashtags API
 * Get trending hashtags with usage counts
 */

import type { APIRoute } from 'astro';
import { getTrendingHashtags } from '../../../lib/social-features';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { recordRequest } from '../../../lib/metrics';
import { getCache, setCache } from '../../../lib/cache';
import { logger } from '../../../lib/logging';

export const GET: APIRoute = async ({ request, url }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    // Parse query params
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 50);
    const period = url.searchParams.get('period') || 'week';

    // Validate period
    if (!['day', 'week', 'month'].includes(period)) {
      recordRequest('GET', '/api/hashtags', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Invalid period. Use: day, week, or month',
        HttpStatus.BAD_REQUEST,
        undefined,
        requestId
      );
    }

    // Check cache
    const cacheKey = `sanliurfa:hashtags:list:${period}:${limit}`;
    const cached = await getCache(cacheKey);
    if (cached) {
      const duration = Date.now() - startTime;
      recordRequest('GET', '/api/hashtags', HttpStatus.OK, duration);
      return apiResponse(
        {
          success: true,
          data: JSON.parse(cached),
          count: limit,
          period
        },
        HttpStatus.OK,
        requestId
      );
    }

    // Fetch from social features library
    const hashtags = await getTrendingHashtags(limit, period as any);

    // Cache result (30 min TTL)
    await setCache(cacheKey, JSON.stringify(hashtags), 1800);

    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/hashtags', HttpStatus.OK, duration);

    return apiResponse(
      {
        success: true,
        data: hashtags,
        count: hashtags.length,
        period
      },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/hashtags', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error(
      'Failed to get hashtags',
      error instanceof Error ? error : new Error(String(error))
    );
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to get hashtags',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
