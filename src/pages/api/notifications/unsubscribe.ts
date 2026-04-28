import type { APIRoute } from 'astro';
import { unsubscribeUser } from '../../../lib/push';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { recordRequest } from '../../../lib/metrics';
import { logger } from '../../../lib/logging';

interface UnsubscribeBody {
  endpoint?: string;
}

export const POST: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId(request);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.id) {
      recordRequest('POST', '/api/notifications/unsubscribe', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(ErrorCode.UNAUTHORIZED, 'Kimlik doğrulama gerekli', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const body = (await request.json()) as UnsubscribeBody;
    const { endpoint } = body;

    if (!endpoint) {
      recordRequest('POST', '/api/notifications/unsubscribe', HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
      return apiError(ErrorCode.VALIDATION_ERROR, 'Eksik alan: endpoint gerekli', HttpStatus.UNPROCESSABLE_ENTITY, undefined, requestId);
    }

    await unsubscribeUser(locals.user.id, endpoint);

    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/notifications/unsubscribe', HttpStatus.OK, duration);

    logger.info('Push unsubscription recorded', { userId: locals.user.id, endpoint });
    return apiResponse({ success: true, message: 'Abonelik iptal edildi' }, HttpStatus.OK, requestId);
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/notifications/unsubscribe', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Push unsubscription failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'İçsel sunucu hatası', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};

