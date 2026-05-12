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

type BlockUserBody = {
  blockedUserId?: unknown;
  reason?: unknown;
};

export const GET: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId(request);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user) {
      recordRequest('GET', '/api/users/privacy/block', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(
        ErrorCode.UNAUTHORIZED,
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
  const requestId = getRequestId(request);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user) {
      recordRequest('POST', '/api/users/privacy/block', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(
        ErrorCode.UNAUTHORIZED,
        'Oturum açmanız gerekiyor',
        HttpStatus.UNAUTHORIZED,
        undefined,
        requestId
      );
    }

    const body = await request.json() as BlockUserBody;
    const { blockedUserId, reason } = body;

    if (typeof blockedUserId !== 'string' || blockedUserId.trim().length === 0) {
      recordRequest('POST', '/api/users/privacy/block', HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Engellenecek kullanıcı ID gereklidir',
        HttpStatus.UNPROCESSABLE_ENTITY,
        undefined,
        requestId
      );
    }

    if (reason !== undefined && typeof reason !== 'string') {
      recordRequest('POST', '/api/users/privacy/block', HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Engelleme sebebi string olmalıdır',
        HttpStatus.UNPROCESSABLE_ENTITY,
        undefined,
        requestId
      );
    }

    if (typeof reason === 'string' && reason.length > 500) {
      recordRequest('POST', '/api/users/privacy/block', HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Engelleme sebebi 500 karakterden uzun olamaz',
        HttpStatus.UNPROCESSABLE_ENTITY,
        undefined,
        requestId
      );
    }

    const normalizedBlockedUserId = blockedUserId.trim();
    const normalizedReason = typeof reason === 'string' && reason.trim().length > 0
      ? reason.trim()
      : undefined;

    // Verify target user exists
    const targetUser = await queryOne<{ id: string }>('SELECT id FROM users WHERE id = $1', [normalizedBlockedUserId]);
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

    await blockUser(locals.user.id, normalizedBlockedUserId, normalizedReason);

    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/users/privacy/block', HttpStatus.CREATED, duration);
    logger.logMutation('create', 'blocked_users', normalizedBlockedUserId, locals.user.id);

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
        'Kendinizi veya zaten engellediğiniz birini engelleyemezsiniz',
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
  const requestId = getRequestId(request);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user) {
      recordRequest('DELETE', '/api/users/privacy/block', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(
        ErrorCode.UNAUTHORIZED,
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

    const normalizedBlockedUserId = blockedUserId.trim();
    await unblockUser(locals.user.id, normalizedBlockedUserId);

    const duration = Date.now() - startTime;
    recordRequest('DELETE', '/api/users/privacy/block', HttpStatus.OK, duration);
    logger.logMutation('delete', 'blocked_users', normalizedBlockedUserId, locals.user.id);

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

