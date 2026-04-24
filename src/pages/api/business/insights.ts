/**
 * API: Business Insights
 * GET - AI-driven insights and recommendations
 */
import type { APIRoute } from 'astro';
import { queryOne, queryMany, update } from '../../../lib/postgres';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { recordRequest } from '../../../lib/metrics';
import { logger } from '../../../lib/logging';

interface PlaceOwnerRow {
  owner_id: string | null;
}

interface InsightActionBody {
  placeId?: string;
  insightId?: string;
  action?: 'acknowledge' | string;
}

export const GET: APIRoute = async ({ request, url, locals }) => {
  const requestId = getRequestId(request);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.id) {
      recordRequest('GET', '/api/business/insights', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(ErrorCode.UNAUTHORIZED, 'Oturum açmanız gerekiyor', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const placeId = url.searchParams.get('placeId');
    if (!placeId) {
      recordRequest('GET', '/api/business/insights', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(ErrorCode.VALIDATION_ERROR, 'Mekan ID gereklidir', HttpStatus.BAD_REQUEST, undefined, requestId);
    }

    // Verify ownership
    const place = await queryOne<PlaceOwnerRow>('SELECT owner_id FROM places WHERE id = $1', [placeId]);
    if (!place || place.owner_id !== locals.user.id) {
      recordRequest('GET', '/api/business/insights', HttpStatus.FORBIDDEN, Date.now() - startTime);
      return apiError(ErrorCode.FORBIDDEN, 'Erişim reddedildi', HttpStatus.FORBIDDEN, undefined, requestId);
    }

    const limit = Math.min(parseInt(url.searchParams.get('limit') || '10'), 50);

    const insights = await queryMany(`
      SELECT
        id,
        insight_type,
        title,
        description,
        priority,
        action_recommendation,
        estimated_impact,
        generated_at,
        acknowledged_at
      FROM business_insights
      WHERE place_id = $1
      ORDER BY priority DESC, generated_at DESC
      LIMIT $2
    `, [placeId, limit]);

    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/business/insights', HttpStatus.OK, duration);

    return apiResponse(
      {
        success: true,
        data: insights
      },
      HttpStatus.OK,
      requestId
    );
  } catch (err) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/business/insights', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Failed to get insights', err instanceof Error ? err : new Error(String(err)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'İçgörüler alınırken hata oluştu', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};

export const POST: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId(request);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.id) {
      recordRequest('POST', '/api/business/insights', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(ErrorCode.UNAUTHORIZED, 'Oturum açmanız gerekiyor', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const body = (await request.json()) as InsightActionBody;
    const { placeId, insightId, action } = body;

    if (!placeId || !insightId || !action) {
      recordRequest('POST', '/api/business/insights', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(ErrorCode.VALIDATION_ERROR, 'Zorunlu alanlar eksik', HttpStatus.BAD_REQUEST, undefined, requestId);
    }

    // Verify ownership
    const place = await queryOne<PlaceOwnerRow>('SELECT owner_id FROM places WHERE id = $1', [placeId]);
    if (!place || place.owner_id !== locals.user.id) {
      recordRequest('POST', '/api/business/insights', HttpStatus.FORBIDDEN, Date.now() - startTime);
      return apiError(ErrorCode.FORBIDDEN, 'Erişim reddedildi', HttpStatus.FORBIDDEN, undefined, requestId);
    }

    if (action === 'acknowledge') {
      await update(
        'business_insights',
        { id: insightId },
        { acknowledged_at: new Date() }
      );
    }

    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/business/insights', HttpStatus.OK, duration);
    logger.logMutation('insight_action', 'business_insights', insightId, locals.user.id);

    return apiResponse(
      {
        success: true,
        message: 'İçgörü işlemi başarıyla tamamlandı'
      },
      HttpStatus.OK,
      requestId
    );
  } catch (err) {
    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/business/insights', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Failed to process insight action', err instanceof Error ? err : new Error(String(err)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'İçgörü işlemi tamamlanamadı', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
