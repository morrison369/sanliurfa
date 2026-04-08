/**
 * Trending Searches API
 * GET: Get trending searches
 */

import type { APIRoute } from 'astro';
import { getTrendingSearches } from '../../../lib/search-engine';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { recordRequest } from '../../../lib/metrics';
import { logger } from '../../../lib/logging';

export const GET: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    const url = new URL(request.url);
    const searchType = url.searchParams.get('type') || 'places';
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '10'), 50);

    const trending = await getTrendingSearches(searchType, limit);

    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/search/trending', HttpStatus.OK, duration);

    return apiResponse(
      {
        success: true,
        data: {
          trending,
          searchType,
          count: trending.length
        }
      },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/search/trending', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Get trending searches failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Trend aramaları alınamadı',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
