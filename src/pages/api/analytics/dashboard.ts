import type { APIRoute } from 'astro';
import { getPlaceAnalytics } from '../../../lib/analytics';
import { queryRows } from '../../../lib/postgres';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { recordRequest } from '../../../lib/metrics';
import { logger } from '../../../lib/logging';

export const GET: APIRoute = async ({ request, locals, url }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.id) {
      recordRequest('GET', '/api/analytics/dashboard', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(ErrorCode.AUTH_REQUIRED, 'Auth required', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const days = parseInt(url.searchParams.get('days') || '30', 10);
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

    const places = await queryRows<{ id: string }>('SELECT id FROM places WHERE user_id = $1 LIMIT 10', [locals.user.id]);
    const analyticsData: any = {};
    for (const place of places) {
      const { metrics, summary } = await getPlaceAnalytics(place.id, startDate, endDate);
      analyticsData[place.id] = { metrics, summary };
    }

    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/analytics/dashboard', HttpStatus.OK, duration);
    return apiResponse({ success: true, data: analyticsData }, HttpStatus.OK, requestId);
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/analytics/dashboard', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Dashboard analytics failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Failed', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
