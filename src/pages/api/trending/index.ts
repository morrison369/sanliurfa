/**
 * Trending API
 * Get trending content by entity type and time period
 */

import type { APIRoute } from 'astro';
import { getTrendingScores, getTrendingKeywords } from '../../../lib/trending-recommendations';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { recordRequest } from '../../../lib/metrics';
import { logger } from '../../../lib/logging';

export const GET: APIRoute = async ({ request }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    const url = new URL(request.url);
    const entityType = url.searchParams.get('type') || 'places';
    const period = (url.searchParams.get('period') || 'daily') as 'hourly' | 'daily' | 'weekly';
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);
    const includeKeywords = url.searchParams.get('keywords') === 'true';

    // Get trending scores
    const trending = await getTrendingScores(entityType, period, limit);

    let keywords = [];
    if (includeKeywords) {
      keywords = await getTrendingKeywords(period, 10);
    }

    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/trending', HttpStatus.OK, duration);

    return apiResponse(
      {
        success: true,
        data: {
          trending,
          keywords: includeKeywords ? keywords : undefined,
          metadata: {
            type: entityType,
            period,
            count: trending.length
          }
        }
      },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/trending', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error(
      'Failed to get trending',
      error instanceof Error ? error : new Error(String(error))
    );
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to get trending',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
