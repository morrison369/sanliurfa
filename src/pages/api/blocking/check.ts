/**
 * Check User Blocking Status API
 * GET: Check if sender is blocked by recipient
 */

import type { APIRoute } from 'astro';
import { isUserBlocked } from '../../../lib/blocking';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { recordRequest } from '../../../lib/metrics';
import { logger } from '../../../lib/logging';

export const GET: APIRoute = async ({ request, locals, url }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    const user = locals.user;

    if (!user) {
      recordRequest('GET', '/api/blocking/check', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(
        ErrorCode.AUTH_REQUIRED,
        'Oturum açmanız gerekiyor',
        HttpStatus.UNAUTHORIZED,
        undefined,
        requestId
      );
    }

    const targetUserId = url.searchParams.get('user_id');

    if (!targetUserId) {
      recordRequest('GET', '/api/blocking/check', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Kullanıcı ID gereklidir',
        HttpStatus.BAD_REQUEST,
        undefined,
        requestId
      );
    }

    // Check if current user is blocked BY target user (can't message them)
    const isBlocked = await isUserBlocked(targetUserId, user.id);

    // Check if current user blocked target user (can't receive messages from them)
    const hasBlocked = await isUserBlocked(user.id, targetUserId);

    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/blocking/check', HttpStatus.OK, duration);

    return apiResponse(
      {
        success: true,
        data: {
          blocked_by_user: isBlocked,
          blocked_user: hasBlocked,
          can_message: !isBlocked && !hasBlocked
        }
      },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/blocking/check', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Check blocking failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Kontrol edilirken bir hata oluştu',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
