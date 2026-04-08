/**
 * Following API
 * GET: List followers or following (query param: type=followers|following, limit, offset)
 * POST: Follow a user (body: followed_id)
 */

import type { APIRoute } from 'astro';
import { followUser, unfollowUser, getFollowers, getFollowing } from '../../../lib/following';
import { queryOne } from '../../../lib/postgres';
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
      recordRequest('GET', '/api/following', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(
        ErrorCode.AUTH_REQUIRED,
        'Oturum açmanız gerekiyor',
        HttpStatus.UNAUTHORIZED,
        undefined,
        requestId
      );
    }

    const type = url.searchParams.get('type') || 'followers';
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);
    const offset = parseInt(url.searchParams.get('offset') || '0');

    let data;
    if (type === 'following') {
      data = await getFollowing(user.id, limit, offset);
    } else {
      data = await getFollowers(user.id, limit, offset);
    }

    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/following', HttpStatus.OK, duration);

    return apiResponse(
      {
        success: true,
        data: data,
        count: data.length,
        type: type
      },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/following', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Get following failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Takip listesi alınırken hata oluştu',
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
      recordRequest('POST', '/api/following', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
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
      recordRequest('POST', '/api/following', HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Takip edilecek kullanıcı ID gereklidir',
        HttpStatus.UNPROCESSABLE_ENTITY,
        undefined,
        requestId
      );
    }

    // Check if target user exists
    const targetUser = await queryOne('SELECT id FROM users WHERE id = $1', [followed_id]);
    if (!targetUser) {
      recordRequest('POST', '/api/following', HttpStatus.NOT_FOUND, Date.now() - startTime);
      return apiError(
        ErrorCode.NOT_FOUND,
        'Kullanıcı bulunamadı',
        HttpStatus.NOT_FOUND,
        undefined,
        requestId
      );
    }

    // Prevent self-following
    if (user.id === followed_id) {
      recordRequest('POST', '/api/following', HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Kendinizi takip edemezsiniz',
        HttpStatus.UNPROCESSABLE_ENTITY,
        undefined,
        requestId
      );
    }

    await followUser(user.id, followed_id);

    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/following', HttpStatus.CREATED, duration);
    logger.logMutation('create', 'users_follows', `${user.id}-${followed_id}`, user.id);

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
    recordRequest('POST', '/api/following', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Follow user failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Takip edilirken hata oluştu',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
