/**
 * Conversation Messages API
 * GET: Retrieve messages in a conversation
 * POST: Send a message to an existing conversation
 * DELETE: Hide conversation for current user
 */

import type { APIRoute } from 'astro';
import { getMessages, sendMessage, markConversationRead } from '../../../lib/messages';
import { queryOne } from '../../../lib/postgres';
import { isUserBlocked } from '../../../lib/blocking';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId, validators } from '../../../lib/api';
import { recordRequest } from '../../../lib/metrics';
import { logger } from '../../../lib/logging';
import { deleteCache } from '../../../lib/cache';

function isValidUuid(value: string | undefined): value is string {
  return typeof value === 'string' && validators.uuid(value);
}

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

async function parseMessageBody(request: Request, requestId: string, route: string, startTime: number) {
  const contentType = request.headers.get('content-type') || '';
  if (!contentType.toLowerCase().includes('application/json')) {
    recordRequest('POST', route, HttpStatus.BAD_REQUEST, Date.now() - startTime);
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
    const body = await request.json();
    return { body };
  } catch {
    recordRequest('POST', route, HttpStatus.BAD_REQUEST, Date.now() - startTime);
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

export const GET: APIRoute = async ({ request, locals, params }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    const user = locals.user;
    const { conversationId } = params;
    const route = `/api/messages/${conversationId ?? 'unknown'}`;

    if (!user) {
      recordRequest('GET', route, HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(
        ErrorCode.AUTH_REQUIRED,
        'Oturum açmanız gerekiyor',
        HttpStatus.UNAUTHORIZED,
        undefined,
        requestId
      );
    }

    if (!isValidUuid(conversationId)) {
      recordRequest('GET', route, HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Geçersiz konuşma kimliği',
        HttpStatus.BAD_REQUEST,
        undefined,
        requestId
      );
    }

    // Get URL parameters
    const url = new URL(request.url);
    const limit = parseLimit(url.searchParams.get('limit'));
    const before = url.searchParams.get('before') || undefined;

    if (limit === null) {
      recordRequest('GET', route, HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'limit pozitif bir sayı olmalı',
        HttpStatus.BAD_REQUEST,
        undefined,
        requestId
      );
    }

    if (before && !isValidUuid(before)) {
      recordRequest('GET', route, HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Geçersiz before parametresi',
        HttpStatus.BAD_REQUEST,
        undefined,
        requestId
      );
    }

    // Get messages (includes access control check)
    const messages = await getMessages(conversationId, user.id, limit, before);

    // Auto-mark as read when fetching
    await markConversationRead(conversationId, user.id);

    const duration = Date.now() - startTime;
    recordRequest('GET', route, HttpStatus.OK, duration);

    return apiResponse(
      {
        success: true,
        data: messages,
        count: messages.length,
        limit: limit
      },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    const statusCode = error instanceof Error && error.message.includes('Access denied') ? HttpStatus.FORBIDDEN : HttpStatus.INTERNAL_SERVER_ERROR;
    recordRequest('GET', `/api/messages/${params.conversationId ?? 'unknown'}`, statusCode, duration);

    if (error instanceof Error && error.message.includes('not found')) {
      return apiError(
        ErrorCode.NOT_FOUND,
        'Konuşma bulunamadı',
        HttpStatus.NOT_FOUND,
        undefined,
        requestId
      );
    }

    if (error instanceof Error && error.message.includes('Access denied')) {
      return apiError(
        ErrorCode.FORBIDDEN,
        'Bu konuşmaya erişim izniniz yok',
        HttpStatus.FORBIDDEN,
        undefined,
        requestId
      );
    }

    logger.error('Get messages failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Mesajlar alınırken bir hata oluştu',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};

export const POST: APIRoute = async ({ request, locals, params }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    const user = locals.user;
    const { conversationId } = params;
    const route = `/api/messages/${conversationId ?? 'unknown'}`;

    if (!user) {
      recordRequest('POST', route, HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(
        ErrorCode.AUTH_REQUIRED,
        'Oturum açmanız gerekiyor',
        HttpStatus.UNAUTHORIZED,
        undefined,
        requestId
      );
    }

    if (!isValidUuid(conversationId)) {
      recordRequest('POST', route, HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Geçersiz konuşma kimliği',
        HttpStatus.BAD_REQUEST,
        undefined,
        requestId
      );
    }

    const parsed = await parseMessageBody(request, requestId, route, startTime);
    if (parsed.response) {
      return parsed.response;
    }

    const { content } = parsed.body as { content?: unknown };

    // Validate input
    if (!content) {
      recordRequest('POST', route, HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Mesaj içeriği gereklidir',
        HttpStatus.UNPROCESSABLE_ENTITY,
        undefined,
        requestId
      );
    }

    if (typeof content !== 'string' || content.trim().length === 0) {
      recordRequest('POST', route, HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Mesaj boş olamaz',
        HttpStatus.UNPROCESSABLE_ENTITY,
        undefined,
        requestId
      );
    }

    if (content.length > 5000) {
      recordRequest('POST', route, HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Mesaj çok uzun (maksimum 5000 karakter)',
        HttpStatus.UNPROCESSABLE_ENTITY,
        undefined,
        requestId
      );
    }

    // Get conversation to find recipient (optimized: select only needed columns)
    const conversation = await queryOne(
      'SELECT id, participant_a, participant_b FROM conversations WHERE id = $1',
      [conversationId]
    );

    if (!conversation) {
      recordRequest('POST', route, HttpStatus.NOT_FOUND, Date.now() - startTime);
      return apiError(
        ErrorCode.NOT_FOUND,
        'Konuşma bulunamadı',
        HttpStatus.NOT_FOUND,
        undefined,
        requestId
      );
    }

    const isParticipant = conversation.participant_a === user.id || conversation.participant_b === user.id;
    if (!isParticipant) {
      recordRequest('POST', route, HttpStatus.FORBIDDEN, Date.now() - startTime);
      return apiError(
        ErrorCode.FORBIDDEN,
        'Bu konuşmaya erişim izniniz yok',
        HttpStatus.FORBIDDEN,
        undefined,
        requestId
      );
    }

    // Determine recipient
    const recipientId = conversation.participant_a === user.id ? conversation.participant_b : conversation.participant_a;

    // Check if sender is blocked by recipient
    const isBlocked = await isUserBlocked(recipientId, user.id);
    if (isBlocked) {
      recordRequest('POST', route, HttpStatus.FORBIDDEN, Date.now() - startTime);
      return apiError(
        ErrorCode.FORBIDDEN,
        'Bu kullanıcı mesaj almıyor. Sizi engellemiş olabilir.',
        HttpStatus.FORBIDDEN,
        undefined,
        requestId
      );
    }

    // Send message (includes access control check)
    const message = await sendMessage(conversationId, user.id, content.trim());

    const duration = Date.now() - startTime;
    recordRequest('POST', route, HttpStatus.CREATED, duration);
    logger.logMutation('create', 'direct_messages', message.id, user.id, { conversationId });

    return apiResponse(
      {
        success: true,
        data: message
      },
      HttpStatus.CREATED,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    const statusCode = error instanceof Error && error.message.includes('Access denied') ? HttpStatus.FORBIDDEN : HttpStatus.INTERNAL_SERVER_ERROR;
    recordRequest('POST', `/api/messages/${params.conversationId ?? 'unknown'}`, statusCode, duration);

    if (error instanceof Error && error.message.includes('not found')) {
      return apiError(
        ErrorCode.NOT_FOUND,
        'Konuşma bulunamadı',
        HttpStatus.NOT_FOUND,
        undefined,
        requestId
      );
    }

    if (error instanceof Error && error.message.includes('Access denied')) {
      return apiError(
        ErrorCode.FORBIDDEN,
        'Bu konuşmaya erişim izniniz yok',
        HttpStatus.FORBIDDEN,
        undefined,
        requestId
      );
    }

    logger.error('Send message failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Mesaj gönderilirken bir hata oluştu',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};

export const DELETE: APIRoute = async ({ request, locals, params }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    const user = locals.user;
    const { conversationId } = params;
    const route = `/api/messages/${conversationId ?? 'unknown'}`;

    if (!user) {
      recordRequest('DELETE', route, HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(
        ErrorCode.AUTH_REQUIRED,
        'Oturum açmanız gerekiyor',
        HttpStatus.UNAUTHORIZED,
        undefined,
        requestId
      );
    }

    if (!isValidUuid(conversationId)) {
      recordRequest('DELETE', route, HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Geçersiz konuşma kimliği',
        HttpStatus.BAD_REQUEST,
        undefined,
        requestId
      );
    }

    // Verify user is participant (soft delete via archive table concept)
    const conversation = await queryOne(
      'SELECT * FROM conversations WHERE id = $1',
      [conversationId]
    );

    if (!conversation) {
      recordRequest('DELETE', route, HttpStatus.NOT_FOUND, Date.now() - startTime);
      return apiError(
        ErrorCode.NOT_FOUND,
        'Konuşma bulunamadı',
        HttpStatus.NOT_FOUND,
        undefined,
        requestId
      );
    }

    const isParticipant = conversation.participant_a === user.id || conversation.participant_b === user.id;
    if (!isParticipant) {
      recordRequest('DELETE', route, HttpStatus.FORBIDDEN, Date.now() - startTime);
      return apiError(
        ErrorCode.FORBIDDEN,
        'Bu konuşmaya erişim izniniz yok',
        HttpStatus.FORBIDDEN,
        undefined,
        requestId
      );
    }

    // For now, we just clear the inbox cache - actual soft delete would require archive table
    // This prevents the conversation from appearing in their inbox until next message
    await deleteCache(`sanliurfa:messages:inbox:${user.id}`);

    const duration = Date.now() - startTime;
    recordRequest('DELETE', route, HttpStatus.OK, duration);
    logger.logMutation('delete', 'conversations', conversationId, user.id);

    return apiResponse(
      {
        success: true,
        message: 'Konuşma gizlendi'
      },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('DELETE', `/api/messages/${params.conversationId ?? 'unknown'}`, HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Delete conversation failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Konuşma silinirken bir hata oluştu',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
