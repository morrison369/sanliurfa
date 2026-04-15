/**
 * POST /api/followers/[id]  — Follow user
 * DELETE /api/followers/[id] — Unfollow user
 */

import type { APIRoute } from 'astro';
import { followUser, unfollowUser } from '../../../lib/followers/followers';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { logger } from '../../../lib/logger';

export const POST: APIRoute = async ({ request, params, locals }) => {
  const requestId = getRequestId({ request } as any);

  try {
    if (!locals.user?.id) {
      return apiError(ErrorCode.UNAUTHORIZED, 'Kimlik doğrulama gerekli', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const { id: targetUserId } = params;
    if (!targetUserId) {
      return apiError(ErrorCode.VALIDATION_ERROR, 'Kullanıcı ID zorunludur', HttpStatus.BAD_REQUEST, undefined, requestId);
    }

    if (targetUserId === locals.user.id) {
      return apiError(ErrorCode.VALIDATION_ERROR, 'Kendinizi takip edemezsiniz', HttpStatus.BAD_REQUEST, undefined, requestId);
    }

    await followUser(locals.user.id, targetUserId);
    logger.info('User followed', { followerId: locals.user.id, targetId: targetUserId });

    return apiResponse({ success: true, following: true }, HttpStatus.CREATED, requestId);
  } catch (error) {
    logger.error('Follow user failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Takip işlemi başarısız', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};

export const DELETE: APIRoute = async ({ request, params, locals }) => {
  const requestId = getRequestId({ request } as any);

  try {
    if (!locals.user?.id) {
      return apiError(ErrorCode.UNAUTHORIZED, 'Kimlik doğrulama gerekli', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const { id: targetUserId } = params;
    if (!targetUserId) {
      return apiError(ErrorCode.VALIDATION_ERROR, 'Kullanıcı ID zorunludur', HttpStatus.BAD_REQUEST, undefined, requestId);
    }

    await unfollowUser(locals.user.id, targetUserId);
    logger.info('User unfollowed', { followerId: locals.user.id, targetId: targetUserId });

    return apiResponse({ success: true, following: false }, HttpStatus.OK, requestId);
  } catch (error) {
    logger.error('Unfollow user failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Takip kaldırma işlemi başarısız', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
