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

export const POST: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId(request);
  const startTime = Date.now();

  try {
    const body = (await request.json()) as AnalyticsEventBody;
    const { sessionId, eventType, metadata } = body;
    const userId = locals.user?.id;

    if (!sessionId || !eventType) {
      recordRequest('POST', '/api/analytics/events', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(ErrorCode.VALIDATION_ERROR, 'Zorunlu alanlar eksik', HttpStatus.BAD_REQUEST, undefined, requestId);
    }

    if (typeof sessionId === 'string' && sessionId.length > 200) {
      recordRequest('POST', '/api/analytics/events', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(ErrorCode.VALIDATION_ERROR, 'sessionId 200 karakterden uzun olamaz', HttpStatus.BAD_REQUEST, undefined, requestId);
    }

    switch (eventType) {
      case 'pageview': {
        const pageUrl = typeof metadata?.pageUrl === 'string' ? metadata.pageUrl.substring(0, 2000) : '/';
        await recordPageView({ path: pageUrl, ...(userId ? { userId } : {}) });
        break;
      }
      case 'interaction': {
        const type = typeof metadata?.type === 'string' ? metadata.type.substring(0, 100) : 'interaction';
        const element = typeof metadata?.element === 'string' ? metadata.element.substring(0, 200) : 'unknown';
        await recordInteraction({
          type,
          element,
          ...(userId ? { userId } : {}),
          ...(metadata ? { metadata } : {}),
        });
        break;
      }
      case 'search': {
        const searchQuery = typeof metadata?.query === 'string' ? metadata.query.substring(0, 500) : '';
        const resultCountRaw = Number(metadata?.resultCount);
        const resultsCount = Number.isFinite(resultCountRaw) ? Math.max(0, Math.floor(resultCountRaw)) : 0;
        await recordSearch({ query: searchQuery, resultsCount, ...(userId ? { userId } : {}) });
        break;
      }
      case 'place_view':
        if (!metadata?.placeId) {
          recordRequest('POST', '/api/analytics/events', HttpStatus.BAD_REQUEST, Date.now() - startTime);
          return apiError(ErrorCode.VALIDATION_ERROR, 'Mekan ID gereklidir', HttpStatus.BAD_REQUEST, undefined, requestId);
        }
        await recordPlaceView({
          placeId: String(metadata.placeId).substring(0, 100),
          ...(userId ? { userId } : {}),
          ...(typeof metadata.source === 'string'
            ? { source: metadata.source.substring(0, 100) }
            : {}),
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
