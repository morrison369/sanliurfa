import type { APIRoute } from 'astro';
import { getUnreadCount } from '../../../lib/message/messages';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { recordRequest } from '../../../lib/metrics';
import { logger } from '../../../lib/logging';

export const GET: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId(request);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.id) {
      recordRequest('GET', '/api/messages/unread-count', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(ErrorCode.UNAUTHORIZED, 'Oturum açmanız gerekiyor', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const count = await getUnreadCount(locals.user.id);
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/messages/unread-count', HttpStatus.OK, duration);

    return apiResponse({ success: true, data: { count } }, HttpStatus.OK, requestId);
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/messages/unread-count', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Get unread count failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Okunmamış mesaj sayısı alınırken bir hata oluştu', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
