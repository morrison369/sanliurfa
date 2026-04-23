import type { APIRoute } from 'astro';
import { getConversations, getOrCreateConversation } from '../../../lib/messages';
import { queryOne } from '../../../lib/postgres';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { recordRequest } from '../../../lib/metrics';
import { logger } from '../../../lib/logging';
import { canStartConversation } from '../../../lib/social-policy';
import { enforceApiRateLimit } from '../../../lib/api-rate-limit';

export const GET: APIRoute = async ({ request, locals, url }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.id) {
      recordRequest('GET', '/api/messages', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(ErrorCode.AUTH_REQUIRED, 'Oturum açmanız gerekiyor', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const isAllowed = await enforceApiRateLimit(request, 'messages:inbox:list', 120, 15 * 60, locals.user.id);
    if (!isAllowed) {
      recordRequest('GET', '/api/messages', HttpStatus.RATE_LIMITED, Date.now() - startTime);
      return apiError(
        ErrorCode.RATE_LIMITED,
        'Çok sık mesaj kutusu sorguluyorsunuz. Lütfen kısa süre sonra tekrar deneyin.',
        HttpStatus.RATE_LIMITED,
        undefined,
        requestId
      );
    }

    const limit = parseInt(url.searchParams.get('limit') || '50', 10);
    const offset = parseInt(url.searchParams.get('offset') || '0', 10);

    const convos = await getConversations(locals.user.id, limit, offset);
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/messages', HttpStatus.OK, duration);

    return apiResponse({ success: true, data: convos, count: convos.length }, HttpStatus.OK, requestId);
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/messages', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Get messages failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'İşlem tamamlanamadı', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};

export const POST: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.id) {
      recordRequest('POST', '/api/messages', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(ErrorCode.AUTH_REQUIRED, 'Oturum açmanız gerekiyor', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const isAllowed = await enforceApiRateLimit(request, 'messages:conversation:create', 60, 15 * 60, locals.user.id);
    if (!isAllowed) {
      recordRequest('POST', '/api/messages', HttpStatus.RATE_LIMITED, Date.now() - startTime);
      return apiError(
        ErrorCode.RATE_LIMITED,
        'Çok sık konuşma başlatıyorsunuz. Lütfen kısa süre sonra tekrar deneyin.',
        HttpStatus.RATE_LIMITED,
        undefined,
        requestId
      );
    }

    const body = await request.json();
    const { recipient_id } = body;

    if (!recipient_id) {
      recordRequest('POST', '/api/messages', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(ErrorCode.VALIDATION_ERROR, 'recipient_id required', HttpStatus.BAD_REQUEST, undefined, requestId);
    }

    const policy = await canStartConversation(locals.user.id, recipient_id);
    if (!policy.allowed) {
      const statusCode = policy.code === 'target_not_found' ? HttpStatus.NOT_FOUND : HttpStatus.FORBIDDEN;
      recordRequest('POST', '/api/messages', statusCode, Date.now() - startTime);
      return apiError(
        statusCode === HttpStatus.NOT_FOUND ? ErrorCode.NOT_FOUND : ErrorCode.FORBIDDEN,
        policy.message,
        statusCode,
        undefined,
        requestId
      );
    }

    const convo = await getOrCreateConversation(locals.user.id, recipient_id);
    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/messages', HttpStatus.CREATED, duration);

    logger.info('Conversation created', { id: convo.id, userId: locals.user.id });
    return apiResponse({ success: true, data: convo }, HttpStatus.CREATED, requestId);
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/messages', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Create conversation failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'İşlem tamamlanamadı', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
