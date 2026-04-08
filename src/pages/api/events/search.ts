/**
 * Search Events
 * GET /api/events/search - Search for events by title/description
 */

import type { APIRoute } from 'astro';
import { searchEvents } from '../../../lib/events-management';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { logger } from '../../../lib/logging';
import { recordRequest } from '../../../lib/metrics';

export const GET: APIRoute = async ({ request, url }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    const q = url.searchParams.get('q') || '';
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);

    if (!q || q.trim().length < 2) {
      recordRequest('GET', '/api/events/search', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Search query must be at least 2 characters',
        HttpStatus.BAD_REQUEST,
        undefined,
        requestId
      );
    }

    const events = await searchEvents(q, limit);

    recordRequest('GET', '/api/events/search', HttpStatus.OK, Date.now() - startTime);

    return apiResponse({
      success: true,
      events,
      count: events.length,
      query: q
    }, HttpStatus.OK, requestId);
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/events/search', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Failed to search events', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to search events',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
