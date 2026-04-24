import type { APIRoute } from 'astro';
import { recordPageView, recordInteraction, recordSearch, recordPlaceView } from '../../../lib/analytics';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { recordRequest } from '../../../lib/metrics';

type AnalyticsEventType = 'pageview' | 'interaction' | 'search' | 'place_view';

interface AnalyticsEventBody {
  sessionId?: string;
  userId?: string;
  eventType?: AnalyticsEventType;
  metadata?: {
    pageUrl?: string;
    type?: string;
    element?: string;
    query?: string;
    filters?: unknown;
    resultCount?: number;
    placeId?: string;
    source?: string;
    [key: string]: unknown;
  };
}

export const POST: APIRoute = async ({ request }) => {
  const requestId = getRequestId(request);
  const startTime = Date.now();

  try {
    const body = (await request.json()) as AnalyticsEventBody;
    const { sessionId, userId, eventType, metadata } = body;

    if (!sessionId || !eventType) {
      recordRequest('POST', '/api/analytics/events', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(ErrorCode.VALIDATION_ERROR, 'Zorunlu alanlar eksik', HttpStatus.BAD_REQUEST, undefined, requestId);
    }

    switch (eventType) {
      case 'pageview':
        await recordPageView({
          path: metadata?.pageUrl || '/',
          userId,
        });
        break;
      case 'interaction':
        await recordInteraction({
          type: metadata?.type || 'interaction',
          element: metadata?.element || 'unknown',
          userId,
          metadata,
        });
        break;
      case 'search':
        await recordSearch({
          query: metadata?.query || '',
          resultsCount: metadata?.resultCount || 0,
          userId,
        });
        break;
      case 'place_view':
        if (!metadata?.placeId) {
          recordRequest('POST', '/api/analytics/events', HttpStatus.BAD_REQUEST, Date.now() - startTime);
          return apiError(ErrorCode.VALIDATION_ERROR, 'Mekan ID gereklidir', HttpStatus.BAD_REQUEST, undefined, requestId);
        }
        await recordPlaceView({
          placeId: metadata.placeId,
          userId,
          source: typeof metadata.source === 'string' ? metadata.source : undefined,
        });
        break;
    }

    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/analytics/events', HttpStatus.CREATED, duration);
    return apiResponse({ success: true }, HttpStatus.CREATED, requestId);
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/analytics/events', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    return apiError(ErrorCode.INTERNAL_ERROR, 'Analitik olayı kaydedilemedi', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};

