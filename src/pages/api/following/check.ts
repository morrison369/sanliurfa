/**
 * Check Following Status API
 * GET: Check if current user follows target user (query param: user_id)
 */

import type { APIRoute } from 'astro';
import { isFollowing } from '../../../lib/following';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { recordRequest } from '../../../lib/metrics';
import { logger } from '../../../lib/logging';

export const GET: APIRoute = async ({ request, locals, url }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    const user = locals.user;
    const targetUserId = url.searchParams.get('user_id');

    if (!targetUserId) {
      recordRequest('GET', '/api/following/check', HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Kontrol edilecek kullanıcı ID gereklidir',
        HttpStatus.UNPROCESSABLE_ENTITY,
        undefined,
        requestId
      );
    }

    // If not logged in, just return false
    let isFollowingStatus = false;
    if (user) {
      isFollowingStatus = await isFollowing(user.id, targetUserId);
    }

    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/following/check', HttpStatus.OK, duration);

    return apiResponse(
      {
        success: true,
        data: {
          is_following: isFollowingStatus
        }
      },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/following/check', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Check following failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Takip durumu kontrol edilirken hata oluştu',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
