/**
 * Notification Muting API
 * POST: Mute notifications from a user
 * DELETE: Unmute notifications from a user
 */

import type { APIRoute } from 'astro';
import { muteUser, unmuteUser } from '../../../../lib/privacy';
import { queryOne } from '../../../../lib/postgres';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../lib/api';
import { recordRequest } from '../../../../lib/metrics';
import { logger } from '../../../../lib/logging';

export const POST: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user) {
      recordRequest('POST', '/api/users/privacy/mute', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(
        ErrorCode.AUTH_REQUIRED,
        'Oturum açmanız gerekiyor',
        HttpStatus.UNAUTHORIZED,
        undefined,
        requestId
      );
    }

    const body = await request.json();
    const { mutedUserId } = body;

    if (!mutedUserId) {
      recordRequest('POST', '/api/users/privacy/mute', HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Susturulacak kullanıcı ID gereklidir',
        HttpStatus.UNPROCESSABLE_ENTITY,
        undefined,
        requestId
      );
    }

    // Verify target user exists
    const targetUser = await queryOne('SELECT id FROM users WHERE id = $1', [mutedUserId]);
    if (!targetUser) {
      recordRequest('POST', '/api/users/privacy/mute', HttpStatus.NOT_FOUND, Date.now() - startTime);
      return apiError(
        ErrorCode.NOT_FOUND,
        'Kullanıcı bulunamadı',
        HttpStatus.NOT_FOUND,
        undefined,
        requestId
      );
    }

    await muteUser(locals.user.id, mutedUserId);

    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/users/privacy/mute', HttpStatus.CREATED, duration);
    logger.logMutation('create', 'muted_users', mutedUserId, locals.user.id);

    return apiResponse(
      {
        success: true,
        message: 'Bu kullanıcıdan gelen bildirimler susturuldu'
      },
      HttpStatus.CREATED,
      requestId
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes('kendini')) {
      recordRequest('POST', '/api/users/privacy/mute', HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        error.message,
        HttpStatus.UNPROCESSABLE_ENTITY,
        undefined,
        requestId
      );
    }

    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/users/privacy/mute', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Mute user failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Kullanıcı susturulurken bir hata oluştu',
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
      recordRequest('DELETE', '/api/users/privacy/mute', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(
        ErrorCode.AUTH_REQUIRED,
        'Oturum açmanız gerekiyor',
        HttpStatus.UNAUTHORIZED,
        undefined,
        requestId
      );
    }

    const mutedUserId = url.searchParams.get('mutedUserId');

    if (!mutedUserId) {
      recordRequest('DELETE', '/api/users/privacy/mute', HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'mutedUserId parametresi gereklidir',
        HttpStatus.UNPROCESSABLE_ENTITY,
        undefined,
        requestId
      );
    }

    await unmuteUser(locals.user.id, mutedUserId);

    const duration = Date.now() - startTime;
    recordRequest('DELETE', '/api/users/privacy/mute', HttpStatus.OK, duration);
    logger.logMutation('delete', 'muted_users', mutedUserId, locals.user.id);

    return apiResponse(
      {
        success: true,
        message: 'Kullanıcı sessize alındı'
      },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('DELETE', '/api/users/privacy/mute', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Unmute user failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Ses açma işleminde bir hata oluştu',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
