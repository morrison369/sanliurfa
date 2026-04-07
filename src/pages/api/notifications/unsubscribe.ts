import type { APIRoute } from 'astro';
import { unsubscribeUser } from '../../../lib/push';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { recordRequest } from '../../../lib/metrics';
import { logger } from '../../../lib/logging';

export const POST: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.id) {
      recordRequest('POST', '/api/notifications/unsubscribe', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(ErrorCode.AUTH_REQUIRED, 'Kimlik doğrulama gerekli', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const body = await request.json();
    const { endpoint } = body;

    if (!endpoint) {
      recordRequest('POST', '/api/notifications/unsubscribe', HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
      return apiError(ErrorCode.VALIDATION_ERROR, 'Eksik alan: endpoint gerekli', HttpStatus.UNPROCESSABLE_ENTITY, undefined, requestId);
    }

    const success = await unsubscribeUser(endpoint, locals.user.id);

    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/notifications/unsubscribe', success ? HttpStatus.OK : HttpStatus.INTERNAL_SERVER_ERROR, duration);

    if (!success) {
      return apiError(ErrorCode.INTERNAL_ERROR, 'Abonelik iptal başarısız', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
    }

    logger.info('Push unsubscription recorded', { userId: locals.user.id, endpoint });
    return apiResponse({ success: true, message: 'Abonelik iptal edildi' }, HttpStatus.OK, requestId);
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/notifications/unsubscribe', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Push unsubscription failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'İçsel sunucu hatası', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
