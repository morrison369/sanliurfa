import type { APIRoute } from 'astro';
import { recordPageView, recordInteraction, recordSearch, recordPlaceView } from '../../../lib/analytics';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { recordRequest } from '../../../lib/metrics';

export const POST: APIRoute = async ({ request }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();

  try {
    const body = await request.json();
    const { sessionId, userId, eventType, metadata } = body;

    if (!sessionId || !eventType) {
      recordRequest('POST', '/api/analytics/events', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(ErrorCode.VALIDATION_ERROR, 'Missing required fields', HttpStatus.BAD_REQUEST, undefined, requestId);
    }

    switch (eventType) {
      case 'pageview':
        await recordPageView(sessionId, userId, metadata?.pageUrl, metadata);
        break;
      case 'interaction':
        await recordInteraction(sessionId, userId, metadata?.type, metadata);
        break;
      case 'search':
        await recordSearch(sessionId, userId, metadata?.query, metadata?.filters, metadata?.resultCount);
        break;
      case 'place_view':
        await recordPlaceView(metadata?.placeId, userId, metadata);
        break;
    }

    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/analytics/events', HttpStatus.CREATED, duration);
    return apiResponse({ success: true }, HttpStatus.CREATED, requestId);
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/analytics/events', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    return apiError(ErrorCode.INTERNAL_ERROR, 'Failed', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
