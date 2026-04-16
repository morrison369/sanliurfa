/**
 * Admin Analytics API
 * GET: Get platform-wide analytics and insights
 */

import type { APIRoute } from 'astro';
import { getPlatformStats, getTrendingPlacesByViews, getSearchTrends } from '../../../lib/analytics';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { recordRequest } from '../../../lib/metrics';
import { logger } from '../../../lib/logging';
import { withAdminOpsReadAccess } from '../../../lib/admin-ops-access';

export const GET: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    return await withAdminOpsReadAccess(
      {
        request,
        locals,
        endpoint: '/api/admin/analytics',
        requestId,
        startTime,
        onDenied: (_response, statusCode, duration) => {
          recordRequest('GET', '/api/admin/analytics', statusCode, duration);
        },
        onSuccess: (response, duration) => {
          recordRequest('GET', '/api/admin/analytics', response.status, duration);
        },
      },
      async () => {
        const url = new URL(request.url);
        const days = Math.min(parseInt(url.searchParams.get('days') || '30', 10), 365);
        const limit = Math.min(parseInt(url.searchParams.get('limit') || '10', 10), 50);

        const [platformStats, trendingPlaces, searchTrends] = await Promise.all([
          getPlatformStats(days),
          getTrendingPlacesByViews(7, limit),
          getSearchTrends(7, limit)
        ]);

        return apiResponse(
          {
            success: true,
            data: {
              platformStats,
              trendingPlaces,
              searchTrends,
              period: days
            }
          },
          HttpStatus.OK,
          requestId
        );
      }
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/admin/analytics', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Get analytics failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Analitikler alınırken bir hata oluştu',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
