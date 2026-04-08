import type { APIRoute } from 'astro';
import { getTrendingPlaces } from '../../../lib/social-interactions';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { recordRequest } from '../../../lib/metrics';
import { logger } from '../../../lib/logging';

export const GET: APIRoute = async ({ request, url }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    const limit = parseInt(url.searchParams.get('limit') || '20', 10);
    const category = url.searchParams.get('category') || undefined;
    const trending = await getTrendingPlaces(limit, category);
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/discovery/trending', HttpStatus.OK, duration);
    return apiResponse({ success: true, data: trending, count: trending.length }, HttpStatus.OK, requestId);
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/discovery/trending', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Get trending failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Failed', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
