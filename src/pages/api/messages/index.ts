import type { APIRoute } from 'astro';
import { getConversations, getOrCreateConversation, sendMessage } from '../../../lib/message/messages';
import { queryOne } from '../../../lib/postgres';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { recordRequest } from '../../../lib/metrics';
import { logger } from '../../../lib/logging';

export const GET: APIRoute = async ({ request, locals, url }) => {
  const requestId = getRequestId(request);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.id) {
      recordRequest('GET', '/api/messages', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(ErrorCode.UNAUTHORIZED, 'Oturum açmanız gerekiyor', HttpStatus.UNAUTHORIZED, undefined, requestId);
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
    return apiError(ErrorCode.INTERNAL_ERROR, 'Konuşmalar alınırken bir hata oluştu', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};

export const POST: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId(request);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.id) {
      recordRequest('POST', '/api/messages', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(ErrorCode.UNAUTHORIZED, 'Oturum açmanız gerekiyor', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const body = await request.json() as {
      recipient_id?: unknown;
      recipientId?: unknown;
      content?: unknown;
    };
    const rawRecipientId = body.recipient_id ?? body.recipientId;

    if (typeof rawRecipientId !== 'string' || rawRecipientId.trim().length === 0) {
      recordRequest('POST', '/api/messages', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(ErrorCode.VALIDATION_ERROR, 'Alıcı kimliği gereklidir', HttpStatus.BAD_REQUEST, undefined, requestId);
    }

    const recipientId = rawRecipientId.trim();
    const recipient = await queryOne<{ id: string }>('SELECT id FROM users WHERE id = $1', [recipientId]);
    if (!recipient) {
      recordRequest('POST', '/api/messages', HttpStatus.NOT_FOUND, Date.now() - startTime);
      return apiError(ErrorCode.NOT_FOUND, 'Kullanıcı bulunamadı', HttpStatus.NOT_FOUND, undefined, requestId);
    }

    const convo = await getOrCreateConversation(locals.user.id, recipientId);
    const content = typeof body.content === 'string' ? body.content.trim() : '';
    const message = content.length > 0 ? await sendMessage(convo.id, locals.user.id, content) : null;
    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/messages', HttpStatus.CREATED, duration);

    logger.info('Conversation created', { id: convo.id, userId: locals.user.id });
    return apiResponse({ success: true, data: convo, message }, HttpStatus.CREATED, requestId);
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/messages', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Create conversation failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Konuşma oluşturulurken bir hata oluştu', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
