/**
 * API: Business Trends
 * GET - Trend analysis and predictions
 */
import type { APIRoute } from 'astro';
import { queryOne, queryRows } from '../../../lib/postgres';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { recordRequest } from '../../../lib/metrics';
import { logger } from '../../../lib/logging';

export const GET: APIRoute = async ({ request, url, locals }) => {
  const requestId = getRequestId(request as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.id) {
      recordRequest('GET', '/api/business/trends', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(ErrorCode.UNAUTHORIZED, 'Authentication required', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const placeId = url.searchParams.get('placeId');
    if (!placeId) {
      recordRequest('GET', '/api/business/trends', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(ErrorCode.VALIDATION_ERROR, 'placeId required', HttpStatus.BAD_REQUEST, undefined, requestId);
    }

    // Verify ownership
    const place = await queryOne('SELECT owner_id FROM places WHERE id = $1', [placeId]);
    if (!place || place.owner_id !== locals.user.id) {
      recordRequest('GET', '/api/business/trends', HttpStatus.FORBIDDEN, Date.now() - startTime);
      return apiError(ErrorCode.FORBIDDEN, 'Access denied', HttpStatus.FORBIDDEN, undefined, requestId);
    }

    const trends = await queryRows(`
      SELECT
        trend_type,
        metric_name,
        trend_direction,
        trend_strength,
        forecast_30d,
        forecast_90d,
        anomaly_detected,
        anomaly_explanation,
        created_at,
        updated_at
      FROM business_trends
      WHERE place_id = $1
      ORDER BY updated_at DESC
      LIMIT 20
    `, [placeId]);

    const satisfaction = await queryRows(`
      SELECT
        score_date,
        overall_satisfaction,
        cleanliness_score,
        service_score,
        price_score,
        atmosphere_score
      FROM satisfaction_scores
      WHERE place_id = $1
      ORDER BY score_date DESC
      LIMIT 30
    `, [placeId]);

    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/business/trends', HttpStatus.OK, duration);

    return apiResponse(
      {
        success: true,
        data: {
          trends,
          satisfaction
        }
      },
      HttpStatus.OK,
      requestId
    );
  } catch (err) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/business/trends', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Failed to get trends', err instanceof Error ? err : new Error(String(err)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Internal server error', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
