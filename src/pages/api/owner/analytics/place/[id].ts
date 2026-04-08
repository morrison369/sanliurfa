/**
 * Place Analytics Dashboard
 * GET /api/owner/analytics/place/[id] - Get comprehensive place analytics
 */

import type { APIRoute } from 'astro';
import { getPlaceAnalytics } from '../../../../../lib/business-analytics';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../../lib/api';
import { logger } from '../../../../../lib/logging';
import { recordRequest } from '../../../../../lib/metrics';
import { queryOne } from '../../../../../lib/postgres';

export const GET: APIRoute = async ({ request, params, locals, url }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    // Auth required
    if (!locals.user) {
      recordRequest('GET', '/api/owner/analytics/place/[id]', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(
        ErrorCode.UNAUTHORIZED,
        'Authentication required',
        HttpStatus.UNAUTHORIZED,
        undefined,
        requestId
      );
    }

    const { id: placeId } = params;
    const days = Math.min(parseInt(url.searchParams.get('days') || '30'), 365);

    // Verify ownership
    const place = await queryOne(
      'SELECT id, owner_id FROM places WHERE id = $1',
      [placeId]
    );

    if (!place || place.owner_id !== locals.user.id) {
      recordRequest('GET', '/api/owner/analytics/place/[id]', HttpStatus.FORBIDDEN, Date.now() - startTime);
      return apiError(
        ErrorCode.FORBIDDEN,
        'Access denied',
        HttpStatus.FORBIDDEN,
        undefined,
        requestId
      );
    }

    const analytics = await getPlaceAnalytics(placeId, days);

    if (!analytics) {
      recordRequest('GET', '/api/owner/analytics/place/[id]', HttpStatus.NOT_FOUND, Date.now() - startTime);
      return apiError(
        ErrorCode.NOT_FOUND,
        'Place not found',
        HttpStatus.NOT_FOUND,
        undefined,
        requestId
      );
    }

    recordRequest('GET', '/api/owner/analytics/place/[id]', HttpStatus.OK, Date.now() - startTime);

    return apiResponse({
      success: true,
      analytics,
      days
    }, HttpStatus.OK, requestId);
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/owner/analytics/place/[id]', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Failed to get place analytics', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to get place analytics',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
