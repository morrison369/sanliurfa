/**
 * API: Business Analytics
 * GET - Place analytics and metrics
 */
import type { APIRoute } from 'astro';
import { queryOne } from '../../../lib/postgres';
import { getPlaceAnalytics, getPlaceDailyMetrics, getDashboardOverview } from '../../../lib/business-analytics';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { recordRequest } from '../../../lib/metrics';
import { logger } from '../../../lib/logging';

export const GET: APIRoute = async ({ request, url, locals }) => {
  const requestId = getRequestId(request as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.id) {
      recordRequest('GET', '/api/business/analytics', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(ErrorCode.UNAUTHORIZED, 'Authentication required', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const placeId = url.searchParams.get('placeId');
    if (!placeId) {
      recordRequest('GET', '/api/business/analytics', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(ErrorCode.VALIDATION_ERROR, 'placeId required', HttpStatus.BAD_REQUEST, undefined, requestId);
    }

    // Verify ownership
    const place = await queryOne('SELECT owner_id FROM places WHERE id = $1', [placeId]);
    if (!place || place.owner_id !== locals.user.id) {
      recordRequest('GET', '/api/business/analytics', HttpStatus.FORBIDDEN, Date.now() - startTime);
      return apiError(ErrorCode.FORBIDDEN, 'Access denied', HttpStatus.FORBIDDEN, undefined, requestId);
    }

    const days = parseInt(url.searchParams.get('days') || '30', 10);
    const analytics = await getPlaceAnalytics(placeId, days);
    const metrics = await getPlaceDailyMetrics(placeId, days);
    const overview = await getDashboardOverview(placeId);

    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/business/analytics', HttpStatus.OK, duration);

    return apiResponse(
      {
        success: true,
        data: {
          analytics,
          metrics,
          overview
        }
      },
      HttpStatus.OK,
      requestId
    );
  } catch (err) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/business/analytics', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Failed to get analytics', err instanceof Error ? err : new Error(String(err)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Internal server error', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
