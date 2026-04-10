import type { APIRoute } from 'astro';
import { getConversations, getOrCreateConversation } from '../../../lib/messages';
import { queryOne } from '../../../lib/postgres';
import { AppError, apiResponse, apiError, apiErrorFrom, HttpStatus, ErrorCode, getRequestId, parseBoundedInt, parseJsonBody, validators } from '../../../lib/api';
import { recordRequest } from '../../../lib/metrics';
import { logger } from '../../../lib/logging';

export const GET: APIRoute = async ({ request, locals, url }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.id) {
      recordRequest('GET', '/api/messages', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(ErrorCode.AUTH_REQUIRED, 'Auth required', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const limit = parseBoundedInt(url.searchParams.get('limit'), { defaultValue: 50, min: 1, max: 100 });
    const offset = parseBoundedInt(url.searchParams.get('offset'), { defaultValue: 0, min: 0, allowZero: true });

    if (limit === null || offset === null) {
      recordRequest('GET', '/api/messages', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Invalid pagination parameters',
        HttpStatus.BAD_REQUEST,
        undefined,
        requestId
      );
    }

    const convos = await getConversations(locals.user.id, limit, offset);
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/messages', HttpStatus.OK, duration);

    return apiResponse({ success: true, data: convos, count: convos.length }, HttpStatus.OK, requestId);
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/messages', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Get messages failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Failed', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};

export const POST: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.id) {
      recordRequest('POST', '/api/messages', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(ErrorCode.AUTH_REQUIRED, 'Auth required', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const parsed = await parseJsonBody(request);
    if (parsed.error === 'UNSUPPORTED_CONTENT_TYPE') {
      recordRequest('POST', '/api/messages', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Content-Type application/json olmalı',
        HttpStatus.BAD_REQUEST,
        { contentType: parsed.contentType },
        requestId
      );
    }

    if (parsed.error === 'INVALID_JSON') {
      recordRequest('POST', '/api/messages', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Geçersiz JSON body',
        HttpStatus.BAD_REQUEST,
        undefined,
        requestId
      );
    }

    const { recipient_id } = parsed.body as { recipient_id?: unknown };

    if (typeof recipient_id !== 'string' || !validators.uuid(recipient_id)) {
      recordRequest('POST', '/api/messages', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(ErrorCode.VALIDATION_ERROR, 'Valid recipient_id required', HttpStatus.BAD_REQUEST, undefined, requestId);
    }

    if (recipient_id === locals.user.id) {
      recordRequest('POST', '/api/messages', HttpStatus.CONFLICT, Date.now() - startTime);
      return apiError(ErrorCode.CONFLICT, 'Cannot create conversation with yourself', HttpStatus.CONFLICT, undefined, requestId);
    }

    const recipient = await queryOne('SELECT id FROM users WHERE id = $1', [recipient_id]);
    if (!recipient) {
      recordRequest('POST', '/api/messages', HttpStatus.NOT_FOUND, Date.now() - startTime);
      return apiError(ErrorCode.NOT_FOUND, 'User not found', HttpStatus.NOT_FOUND, undefined, requestId);
    }

    const convo = await getOrCreateConversation(locals.user.id, recipient_id);
    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/messages', HttpStatus.CREATED, duration);

    logger.info('Conversation created', { id: convo.id, userId: locals.user.id });
    return apiResponse({ success: true, data: convo }, HttpStatus.CREATED, requestId);
  } catch (error) {
    if (error instanceof AppError) {
      recordRequest('POST', '/api/messages', error.statusCode, Date.now() - startTime);
      return apiErrorFrom(error, requestId);
    }

    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/messages', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Create conversation failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Failed', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
