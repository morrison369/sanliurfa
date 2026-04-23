import type { APIRoute } from 'astro';
import { followUser, unfollowUser, getFollowers, getFollowing, isFollowing } from '../../../lib/social-features';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { logger } from '../../../lib/logging';
import { canFollowUser } from '../../../lib/social-policy';

export const POST: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  logger.setRequestId(requestId);

  try {
    if (!locals.user) {
      return apiError(ErrorCode.UNAUTHORIZED, 'Oturum açmanız gerekiyor', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const body = await request.json();
    const { user_id_to_follow, action } = body;

    if (!user_id_to_follow) {
      return apiError(ErrorCode.VALIDATION_ERROR, 'Kullanıcı ID gereklidir', HttpStatus.UNPROCESSABLE_ENTITY, undefined, requestId);
    }

    if (action === 'follow') {
      const policy = await canFollowUser(locals.user.id, user_id_to_follow);
      if (!policy.allowed) {
        return apiError(ErrorCode.FORBIDDEN, policy.message, HttpStatus.FORBIDDEN, undefined, requestId);
      }

      const result = await followUser(locals.user.id, user_id_to_follow);
      if (!result) {
        return apiError(ErrorCode.INTERNAL_ERROR, 'Takip işlemi tamamlanamadı', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
      }
      return apiResponse({ success: true, data: result }, HttpStatus.CREATED, requestId);
    } else if (action === 'unfollow') {
      await unfollowUser(locals.user.id, user_id_to_follow);
      return apiResponse({ success: true }, HttpStatus.OK, requestId);
    }

    return apiError(ErrorCode.VALIDATION_ERROR, 'Geçersiz işlem', HttpStatus.UNPROCESSABLE_ENTITY, undefined, requestId);
  } catch (error) {
    logger.error('Takip işlemi yönetilemedi', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Sunucu hatası', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};

export const GET: APIRoute = async ({ request, locals, url }) => {
  const requestId = getRequestId({ request } as any);
  logger.setRequestId(requestId);

  try {
    if (!locals.user) {
      return apiError(ErrorCode.UNAUTHORIZED, 'Oturum açmanız gerekiyor', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const userId = url.searchParams.get('user_id');
    const type = url.searchParams.get('type') || 'followers';
    const limit = parseInt(url.searchParams.get('limit') || '50');

    if (!userId) {
      return apiError(ErrorCode.VALIDATION_ERROR, 'Kullanıcı ID gereklidir', HttpStatus.UNPROCESSABLE_ENTITY, undefined, requestId);
    }

    let data;
    if (type === 'followers') {
      data = await getFollowers(userId, limit);
    } else if (type === 'following') {
      data = await getFollowing(userId, limit);
    } else {
      return apiError(ErrorCode.VALIDATION_ERROR, 'Geçersiz tür', HttpStatus.UNPROCESSABLE_ENTITY, undefined, requestId);
    }

    return apiResponse({ success: true, data }, HttpStatus.OK, requestId);
  } catch (error) {
    logger.error('Takip verileri alınamadı', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Sunucu hatası', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
