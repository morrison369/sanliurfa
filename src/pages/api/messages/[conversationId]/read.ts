/**
 * Mark Conversation as Read API
 * POST: Mark all unread messages in conversation as read
 * Separate endpoint for explicit read marking (also auto-triggered on GET /[conversationId])
 */

import type { APIRoute } from 'astro';
import { markConversationRead } from '../../../../lib/messages';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../lib/api';
import { recordRequest } from '../../../../lib/metrics';
import { logger } from '../../../../lib/logging';

export const POST: APIRoute = async ({ request, locals, params }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    const user = locals.user;
    const { conversationId } = params;

    if (!user) {
      recordRequest('POST', `/api/messages/${conversationId}/read`, HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(
        ErrorCode.AUTH_REQUIRED,
        'Oturum açmanız gerekiyor',
        HttpStatus.UNAUTHORIZED,
        undefined,
        requestId
      );
    }

    // Mark conversation as read (includes access control check)
    await markConversationRead(conversationId, user.id);

    const duration = Date.now() - startTime;
    recordRequest('POST', `/api/messages/${conversationId}/read`, HttpStatus.OK, duration);

    return apiResponse(
      {
        success: true,
        message: 'Konuşma okundu işaretlendi'
      },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    const statusCode = error instanceof Error && error.message.includes('Access denied') ? HttpStatus.FORBIDDEN : HttpStatus.INTERNAL_SERVER_ERROR;
    recordRequest('POST', `/api/messages/${params.conversationId}/read`, statusCode, duration);

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

    logger.error('Mark read failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Okundu işareti eklenirken bir hata oluştu',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
