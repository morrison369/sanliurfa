/**
 * User Sessions Endpoint
 * Get and manage active sessions
 */

import type { APIRoute } from 'astro';
import { getUserSessions, invalidateSession } from '../../../lib/security';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { logger } from '../../../lib/logging';

export const GET: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  logger.setRequestId(requestId);

  try {
    if (!locals.user) {
      return apiError(ErrorCode.UNAUTHORIZED, 'Oturum açmanız gerekiyor', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const sessions = await getUserSessions(locals.user.id);

    return apiResponse({
      success: true,
      data: sessions
    }, HttpStatus.OK, requestId);
  } catch (error) {
    logger.error('Failed to get sessions', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Oturumlar alınamadı', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};

export const DELETE: APIRoute = async ({ request, locals, url }) => {
  const requestId = getRequestId({ request } as any);
  logger.setRequestId(requestId);

  try {
    if (!locals.user) {
      return apiError(ErrorCode.UNAUTHORIZED, 'Oturum açmanız gerekiyor', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const sessionId = url.searchParams.get('session_id');
    if (!sessionId) {
      return apiError(ErrorCode.VALIDATION_ERROR, 'Oturum ID gereklidir', HttpStatus.UNPROCESSABLE_ENTITY, undefined, requestId);
    }

    const success = await invalidateSession(sessionId);
    if (!success) {
      return apiError(ErrorCode.NOT_FOUND, 'Oturum bulunamadı', HttpStatus.NOT_FOUND, undefined, requestId);
    }

    logger.info('Session invalidated', { userId: locals.user.id, sessionId });

    return apiResponse({
      success: true,
      data: { message: 'Oturum sonlandırıldı' }
    }, HttpStatus.OK, requestId);
  } catch (error) {
    logger.error('Failed to invalidate session', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Oturum sonlandırılamadı', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
