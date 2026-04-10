import type { APIRoute } from 'astro';
import { getConversations, getOrCreateConversation } from '../../../lib/messages';
import { queryOne } from '../../../lib/postgres';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId, validators } from '../../../lib/api';
import { recordRequest } from '../../../lib/metrics';
import { logger } from '../../../lib/logging';

function parseLimit(rawLimit: string | null): number | null {
  if (rawLimit === null) {
    return 50;
  }

  const parsed = Number.parseInt(rawLimit, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return null;
  }

  return Math.min(parsed, 100);
}

function parseOffset(rawOffset: string | null): number | null {
  if (rawOffset === null) {
    return 0;
  }

  const parsed = Number.parseInt(rawOffset, 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
}

async function parseJsonBody(request: Request, requestId: string, startTime: number) {
  const contentType = request.headers.get('content-type') || '';
  if (!contentType.toLowerCase().includes('application/json')) {
    recordRequest('POST', '/api/messages', HttpStatus.BAD_REQUEST, Date.now() - startTime);
    return {
      response: apiError(
        ErrorCode.VALIDATION_ERROR,
        'Content-Type application/json olmalı',
        HttpStatus.BAD_REQUEST,
        { contentType },
        requestId
      )
    };
  }

  try {
    return { body: await request.json() };
  } catch {
    recordRequest('POST', '/api/messages', HttpStatus.BAD_REQUEST, Date.now() - startTime);
    return {
      response: apiError(
        ErrorCode.VALIDATION_ERROR,
        'Geçersiz JSON body',
        HttpStatus.BAD_REQUEST,
        undefined,
        requestId
      )
    };
  }
}

export const GET: APIRoute = async ({ request, locals, url }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.id) {
      recordRequest('GET', '/api/messages', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(ErrorCode.AUTH_REQUIRED, 'Auth required', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const limit = parseLimit(url.searchParams.get('limit'));
    const offset = parseOffset(url.searchParams.get('offset'));

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

    const parsed = await parseJsonBody(request, requestId, startTime);
    if (parsed.response) {
      return parsed.response;
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
    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/messages', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Create conversation failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Failed', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
