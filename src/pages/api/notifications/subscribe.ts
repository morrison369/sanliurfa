import type { APIRoute } from 'astro';
import { subscribeUser } from '../../../lib/push';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { recordRequest } from '../../../lib/metrics';
import { logger } from '../../../lib/logging';

export const POST: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.id) {
      recordRequest('POST', '/api/notifications/subscribe', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(ErrorCode.AUTH_REQUIRED, 'Kimlik doğrulama gerekli', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const body = await request.json();
    const { endpoint, p256dh, auth } = body;

    if (!endpoint || !p256dh || !auth) {
      recordRequest('POST', '/api/notifications/subscribe', HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
      return apiError(ErrorCode.VALIDATION_ERROR, 'Eksik alan: endpoint, p256dh, auth gerekli', HttpStatus.UNPROCESSABLE_ENTITY, undefined, requestId);
    }

    const userAgent = request.headers.get('user-agent') || undefined;
    const clientIP = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';

    const success = await subscribeUser(locals.user.id, { endpoint, p256dh, auth }, userAgent, clientIP);

    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/notifications/subscribe', success ? HttpStatus.OK : HttpStatus.INTERNAL_SERVER_ERROR, duration);

    if (!success) {
      return apiError(ErrorCode.INTERNAL_ERROR, 'Abonelik kaydı başarısız', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
    }

    logger.info('Push subscription recorded', { userId: locals.user.id, endpoint });
    return apiResponse({ success: true, message: 'Abonelik başarılı' }, HttpStatus.OK, requestId);
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/notifications/subscribe', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Push subscription failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'İçsel sunucu hatası', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
