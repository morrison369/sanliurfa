/**
 * List Events
 * GET /api/events/list - Get events with filtering and pagination
 */

import type { APIRoute } from 'astro';
import { getEvents } from '../../../lib/events-management';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { logger } from '../../../lib/logging';
import { recordRequest } from '../../../lib/metrics';

export const GET: APIRoute = async ({ request, url }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const category = url.searchParams.get('category') || undefined;
    const placeId = url.searchParams.get('placeId') || undefined;

    const { events, total } = await getEvents(limit, offset, { category, placeId });

    recordRequest('GET', '/api/events/list', HttpStatus.OK, Date.now() - startTime);

    return apiResponse({
      success: true,
      events,
      total,
      limit,
      offset
    }, HttpStatus.OK, requestId);
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/events/list', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Failed to get events', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to get events',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
