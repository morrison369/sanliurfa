/**
 * Search Promotions
 * GET /api/promotions/search - Search for promotions by title or code
 */

import type { APIRoute } from 'astro';
import { searchPromotions, getTrendingPromotions } from '../../../lib/promotions-management';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { logger } from '../../../lib/logging';
import { recordRequest } from '../../../lib/metrics';

export const GET: APIRoute = async ({ request, url }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    const q = url.searchParams.get('q') || '';
    const trending = url.searchParams.get('trending') === 'true';
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);

    let promotions = [];

    if (trending) {
      promotions = await getTrendingPromotions(limit);
    } else if (q && q.trim().length >= 2) {
      promotions = await searchPromotions(q, limit);
    } else {
      recordRequest('GET', '/api/promotions/search', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Search query must be at least 2 characters or use trending=true',
        HttpStatus.BAD_REQUEST,
        undefined,
        requestId
      );
    }

    recordRequest('GET', '/api/promotions/search', HttpStatus.OK, Date.now() - startTime);

    return apiResponse({
      success: true,
      promotions,
      count: promotions.length,
      query: q,
      isTrending: trending
    }, HttpStatus.OK, requestId);
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/promotions/search', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Failed to search promotions', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to search promotions',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
