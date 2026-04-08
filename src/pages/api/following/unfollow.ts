/**
 * Unfollow API
 * POST: Unfollow a user (body: followed_id)
 */

import type { APIRoute } from 'astro';
import { unfollowUser } from '../../../lib/following';
import { queryOne } from '../../../lib/postgres';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { recordRequest } from '../../../lib/metrics';
import { logger } from '../../../lib/logging';

export const POST: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    const user = locals.user;
    if (!user) {
      recordRequest('POST', '/api/following/unfollow', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(
        ErrorCode.AUTH_REQUIRED,
        'Oturum açmanız gerekiyor',
        HttpStatus.UNAUTHORIZED,
        undefined,
        requestId
      );
    }

    const body = await request.json();
    const { followed_id } = body;

    if (!followed_id) {
      recordRequest('POST', '/api/following/unfollow', HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Takip kaldırılacak kullanıcı ID gereklidir',
        HttpStatus.UNPROCESSABLE_ENTITY,
        undefined,
        requestId
      );
    }

    const unfollowed = await unfollowUser(user.id, followed_id);

    if (!unfollowed) {
      recordRequest('POST', '/api/following/unfollow', HttpStatus.NOT_FOUND, Date.now() - startTime);
      return apiError(
        ErrorCode.NOT_FOUND,
        'Takip ilişkisi bulunamadı',
        HttpStatus.NOT_FOUND,
        undefined,
        requestId
      );
    }

    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/following/unfollow', HttpStatus.OK, duration);
    logger.logMutation('delete', 'users_follows', `${user.id}-${followed_id}`, user.id);

    return apiResponse(
      {
        success: true,
        message: 'Takip kaldırıldı'
      },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/following/unfollow', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Unfollow user failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Takip kaldırılırken hata oluştu',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
