/**
 * Place Analytics API
 * GET: Get analytics for a specific place
 */

import type { APIRoute } from 'astro';
import { getPlaceAnalytics } from '../../../../lib/analytics';
import { queryOne } from '../../../../lib/postgres';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../lib/api';
import { recordRequest } from '../../../../lib/metrics';
import { logger } from '../../../../lib/logging';

export const GET: APIRoute = async ({ request, params, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    const user = locals.user;
    const { id: placeId } = params;

    const place = await queryOne('SELECT id, user_id FROM places WHERE id = $1', [placeId]);
    if (!place) {
      recordRequest('GET', `/api/places/${placeId}/analytics`, HttpStatus.NOT_FOUND, Date.now() - startTime);
      return apiError(ErrorCode.NOT_FOUND, 'Mekan bulunamadı', HttpStatus.NOT_FOUND, undefined, requestId);
    }

    const isOwner = user && user.id === place.user_id;
    const isAdmin = user && user.role === 'admin';

    if (!isAdmin && !isOwner) {
      recordRequest('GET', `/api/places/${placeId}/analytics`, HttpStatus.FORBIDDEN, Date.now() - startTime);
      return apiError(ErrorCode.FORBIDDEN, 'Bu mekanın analitiklerini görüntüleme izniniz yok', HttpStatus.FORBIDDEN, undefined, requestId);
    }

    const url = new URL(request.url);
    const days = Math.min(parseInt(url.searchParams.get('days') || '30'), 365);
    const analytics = await getPlaceAnalytics(placeId, days);

    const duration = Date.now() - startTime;
    recordRequest('GET', `/api/places/${placeId}/analytics`, HttpStatus.OK, duration);

    return apiResponse({ success: true, data: analytics, period: days }, HttpStatus.OK, requestId);
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', `/api/places/${params.id}/analytics`, HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Get place analytics failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Analitikler alınırken bir hata oluştu', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
