import type { APIRoute } from 'astro';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { getAlerts, acknowledgeAlert, resolveAlert, performHealthCheck } from '../../../lib/alerts';
import { logger } from '../../../lib/logging';

/**
 * GET /api/admin/alerts - Alertleri listele
 * Query parametreleri:
 *   - type: Alert türü (high_error_rate, slow_response, etc)
 *   - severity: Ciddiyet (info, warning, critical)
 *   - acknowledged: true/false
 *   - limit: Kaç kayıt
 *   - offset: Pagination
 */
export const GET: APIRoute = async ({ request, locals, url }) => {
  const requestId = getRequestId({ request } as any);
  logger.setRequestId(requestId);

  if (!locals.isAdmin) {
    return apiError(ErrorCode.FORBIDDEN, 'Yetkisiz', HttpStatus.FORBIDDEN, undefined, requestId);
  }

  try {
    // Health check çalıştır
    if (url.searchParams.get('healthCheck') === 'true') {
      await performHealthCheck();
    }

    const alerts = await getAlerts({
      type: (url.searchParams.get('type') || undefined) as any,
      severity: (url.searchParams.get('severity') || undefined) as any,
      acknowledged: url.searchParams.get('acknowledged') === 'true' ? true : url.searchParams.get('acknowledged') === 'false' ? false : undefined,
      limit: parseInt(url.searchParams.get('limit') || '50'),
      offset: parseInt(url.searchParams.get('offset') || '0')
    });

    return apiResponse({ alerts, count: alerts.length }, HttpStatus.OK, requestId);
  } catch (error) {
    logger.error('Alertler alınırken hata', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Alertler alınırken hata oluştu',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};

/**
 * PUT /api/admin/alerts/:id - Alert'i güncelle
 */
export const PUT: APIRoute = async ({ request, locals, params }) => {
  const requestId = getRequestId({ request } as any);
  logger.setRequestId(requestId);

  if (!locals.isAdmin) {
    return apiError(ErrorCode.FORBIDDEN, 'Yetkisiz', HttpStatus.FORBIDDEN, undefined, requestId);
  }

  try {
    const body = await request.json();
    const { alertId } = params;

    if (!alertId) {
      return apiError(ErrorCode.VALIDATION_ERROR, 'Alert ID gerekli', HttpStatus.BAD_REQUEST, undefined, requestId);
    }

    if (body.acknowledged === true) {
      const success = await acknowledgeAlert(alertId, locals.user?.id || 'unknown');
      if (!success) {
        return apiError(
          ErrorCode.NOT_FOUND,
          'Alert bulunamadı',
          HttpStatus.NOT_FOUND,
          undefined,
          requestId
        );
      }

      logger.info('Alert işaretlendi', { alertId, userId: locals.user?.id });

      return apiResponse({ success: true, message: 'Alert işaretlendi' }, HttpStatus.OK, requestId);
    }

    if (body.resolved === true) {
      const success = await resolveAlert(alertId);
      if (!success) {
        return apiError(
          ErrorCode.NOT_FOUND,
          'Alert bulunamadı',
          HttpStatus.NOT_FOUND,
          undefined,
          requestId
        );
      }

      logger.info('Alert çözüldü', { alertId });

      return apiResponse({ success: true, message: 'Alert çözüldü' }, HttpStatus.OK, requestId);
    }

    return apiError(
      ErrorCode.VALIDATION_ERROR,
      'acknowledged veya resolved gerekli',
      HttpStatus.BAD_REQUEST,
      undefined,
      requestId
    );
  } catch (error) {
    logger.error('Alert güncellenirken hata', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Alert güncellenirken hata oluştu',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
