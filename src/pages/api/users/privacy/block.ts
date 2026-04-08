/**
 * User Blocking API
 * GET: Get list of blocked users
 * POST: Block a user
 * DELETE: Unblock a user
 */

import type { APIRoute } from 'astro';
import { blockUser, unblockUser, getBlockedUsers } from '../../../../lib/privacy';
import { queryOne } from '../../../../lib/postgres';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../lib/api';
import { recordRequest } from '../../../../lib/metrics';
import { logger } from '../../../../lib/logging';

export const GET: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user) {
      recordRequest('GET', '/api/users/privacy/block', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(
        ErrorCode.AUTH_REQUIRED,
        'Oturum açmanız gerekiyor',
        HttpStatus.UNAUTHORIZED,
        undefined,
        requestId
      );
    }

    const blockedUsers = await getBlockedUsers(locals.user.id);

    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/users/privacy/block', HttpStatus.OK, duration);

    return apiResponse(
      {
        success: true,
        data: blockedUsers,
        count: blockedUsers.length
      },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/users/privacy/block', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Get blocked users failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Engellenen kullanıcılar alınırken bir hata oluştu',
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
    if (!locals.user) {
      recordRequest('POST', '/api/users/privacy/block', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(
        ErrorCode.AUTH_REQUIRED,
        'Oturum açmanız gerekiyor',
        HttpStatus.UNAUTHORIZED,
        undefined,
        requestId
      );
    }

    const body = await request.json();
    const { blockedUserId, reason } = body;

    if (!blockedUserId) {
      recordRequest('POST', '/api/users/privacy/block', HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Engellenecek kullanıcı ID gereklidir',
        HttpStatus.UNPROCESSABLE_ENTITY,
        undefined,
        requestId
      );
    }

    // Verify target user exists
    const targetUser = await queryOne('SELECT id FROM users WHERE id = $1', [blockedUserId]);
    if (!targetUser) {
      recordRequest('POST', '/api/users/privacy/block', HttpStatus.NOT_FOUND, Date.now() - startTime);
      return apiError(
        ErrorCode.NOT_FOUND,
        'Kullanıcı bulunamadı',
        HttpStatus.NOT_FOUND,
        undefined,
        requestId
      );
    }

    await blockUser(locals.user.id, blockedUserId, reason);

    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/users/privacy/block', HttpStatus.CREATED, duration);
    logger.logMutation('create', 'blocked_users', blockedUserId, locals.user.id, { reason });

    return apiResponse(
      {
        success: true,
        message: 'Kullanıcı engellendi'
      },
      HttpStatus.CREATED,
      requestId
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes('engelle')) {
      recordRequest('POST', '/api/users/privacy/block', HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        error.message,
        HttpStatus.UNPROCESSABLE_ENTITY,
        undefined,
        requestId
      );
    }

    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/users/privacy/block', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Block user failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Kullanıcı engellenirken bir hata oluştu',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};

export const DELETE: APIRoute = async ({ request, locals, url }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user) {
      recordRequest('DELETE', '/api/users/privacy/block', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(
        ErrorCode.AUTH_REQUIRED,
        'Oturum açmanız gerekiyor',
        HttpStatus.UNAUTHORIZED,
        undefined,
        requestId
      );
    }

    const blockedUserId = url.searchParams.get('blockedUserId');

    if (!blockedUserId) {
      recordRequest('DELETE', '/api/users/privacy/block', HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'blockedUserId parametresi gereklidir',
        HttpStatus.UNPROCESSABLE_ENTITY,
        undefined,
        requestId
      );
    }

    await unblockUser(locals.user.id, blockedUserId);

    const duration = Date.now() - startTime;
    recordRequest('DELETE', '/api/users/privacy/block', HttpStatus.OK, duration);
    logger.logMutation('delete', 'blocked_users', blockedUserId, locals.user.id);

    return apiResponse(
      {
        success: true,
        message: 'Kullanıcının engeli kaldırıldı'
      },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('DELETE', '/api/users/privacy/block', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Unblock user failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Engel kaldırılırken bir hata oluştu',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
