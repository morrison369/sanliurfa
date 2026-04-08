/**
 * Followers API
 * GET: Get followers/following/mutual friends lists
 * POST: Follow a user
 * DELETE: Unfollow a user
 */

import type { APIRoute } from 'astro';
import { getFollowers, getFollowing, getMutualFriends, followUser, unfollowUser } from '../../../lib/followers';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { recordRequest } from '../../../lib/metrics';
import { logger } from '../../../lib/logging';

export const GET: APIRoute = async ({ request, url, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    // Get query parameters
    const userId = url.searchParams.get('userId');
    const type = url.searchParams.get('type') || 'followers'; // followers, following, mutual
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);

    // Validate parameters
    if (!userId) {
      recordRequest('GET', '/api/followers', HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Kullanıcı ID gereklidir',
        HttpStatus.UNPROCESSABLE_ENTITY,
        undefined,
        requestId
      );
    }

    if (!['followers', 'following', 'mutual'].includes(type)) {
      recordRequest('GET', '/api/followers', HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Geçersiz tür parametresi',
        HttpStatus.UNPROCESSABLE_ENTITY,
        undefined,
        requestId
      );
    }

    let data;

    switch (type) {
      case 'following':
        data = await getFollowing(userId, limit);
        break;
      case 'mutual':
        data = await getMutualFriends(userId, limit);
        break;
      case 'followers':
      default:
        data = await getFollowers(userId, limit);
        break;
    }

    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/followers', HttpStatus.OK, duration);

    return apiResponse(
      {
        success: true,
        data: data,
        count: data.length,
        type
      },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/followers', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Get followers failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Takipçiler alınırken bir hata oluştu',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};

export const POST: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    const user = locals.user;

    if (!user) {
      recordRequest('POST', '/api/followers', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(
        ErrorCode.AUTH_REQUIRED,
        'Oturum açmanız gerekiyor',
        HttpStatus.UNAUTHORIZED,
        undefined,
        requestId
      );
    }

    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      recordRequest('POST', '/api/followers', HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Kullanıcı ID gereklidir',
        HttpStatus.UNPROCESSABLE_ENTITY,
        undefined,
        requestId
      );
    }

    // Follow user
    await followUser(user.id, userId);

    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/followers', HttpStatus.CREATED, duration);
    logger.logMutation('create', 'followers', `${user.id}->${userId}`, user.id);

    return apiResponse(
      {
        success: true,
        message: 'Kullanıcı takip edildi'
      },
      HttpStatus.CREATED,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/followers', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Follow user failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Kullanıcı takip edilirken bir hata oluştu',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};

export const DELETE: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    const user = locals.user;

    if (!user) {
      recordRequest('DELETE', '/api/followers', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(
        ErrorCode.AUTH_REQUIRED,
        'Oturum açmanız gerekiyor',
        HttpStatus.UNAUTHORIZED,
        undefined,
        requestId
      );
    }

    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      recordRequest('DELETE', '/api/followers', HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Kullanıcı ID gereklidir',
        HttpStatus.UNPROCESSABLE_ENTITY,
        undefined,
        requestId
      );
    }

    // Unfollow user
    await unfollowUser(user.id, userId);

    const duration = Date.now() - startTime;
    recordRequest('DELETE', '/api/followers', HttpStatus.OK, duration);
    logger.logMutation('delete', 'followers', `${user.id}->${userId}`, user.id);

    return apiResponse(
      {
        success: true,
        message: 'Kullanıcı takip edilmesi durduruldu'
      },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('DELETE', '/api/followers', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Unfollow user failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Takip durdurulurken bir hata oluştu',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
