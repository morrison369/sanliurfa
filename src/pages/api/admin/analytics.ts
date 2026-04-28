/**
 * Admin Analytics API
 * GET: Get platform-wide analytics and insights
 */

import type { APIRoute } from 'astro';
import { getPlatformStats, getTrendingPlacesByViews, getSearchTrends } from '../../../lib/analytics';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { recordRequest } from '../../../lib/metrics';
import { logger } from '../../../lib/logging';

function toBoundedInt(value: string | null, fallback: number, max: number): number {
  const parsed = Number.parseInt(value || '', 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, max);
}

export const GET: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId(request);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    const user = locals.user;

    // Check admin access
    if (!user || user.role !== 'admin') {
      recordRequest('GET', '/api/admin/analytics', HttpStatus.FORBIDDEN, Date.now() - startTime);
      return apiError(
        ErrorCode.FORBIDDEN,
        'Admin erişimi gereklidir',
        HttpStatus.FORBIDDEN,
        undefined,
        requestId
      );
    }

    const url = new URL(request.url);
    const days = toBoundedInt(url.searchParams.get('days'), 30, 365);
    const limit = toBoundedInt(url.searchParams.get('limit'), 10, 50);

    // Get analytics data
    const [platformStats, trendingPlaces, searchTrends] = await Promise.all([
      getPlatformStats(),
      getTrendingPlacesByViews(limit),
      getSearchTrends()
    ]);

    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/admin/analytics', HttpStatus.OK, duration);

    return apiResponse(
      {
        success: true,
        data: {
          platformStats,
          trendingPlaces,
          searchTrends: searchTrends.slice(0, limit),
          period: days
        }
      },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/admin/analytics', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Get analytics failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Analitik verileri alınırken bir hata oluştu',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};

