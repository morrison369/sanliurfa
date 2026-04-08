/**
 * User Blocking API
 * GET: Get list of blocked users
 * POST: Block a user
 * DELETE: Unblock a user
 */

import type { APIRoute } from 'astro';
import { getBlockedUsers, blockUser, unblockUser } from '../../../lib/blocking';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { recordRequest } from '../../../lib/metrics';
import { logger } from '../../../lib/logging';
import { validateWithSchema } from '../../../lib/validation';

const blockSchema = {
  blocked_id: {
    type: 'string' as const,
    required: true
  },
  reason: {
    type: 'string' as const,
    required: false,
    maxLength: 500,
    sanitize: true
  }
};

export const GET: APIRoute = async ({ request, locals, url }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    const user = locals.user;

    if (!user) {
      recordRequest('GET', '/api/blocking', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(
        ErrorCode.AUTH_REQUIRED,
        'Oturum açmanız gerekiyor',
        HttpStatus.UNAUTHORIZED,
        undefined,
        requestId
      );
    }

    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);
    const offset = parseInt(url.searchParams.get('offset') || '0');

    const blockedUsers = await getBlockedUsers(user.id, limit, offset);

    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/blocking', HttpStatus.OK, duration);

    return apiResponse(
      {
        success: true,
        data: blockedUsers,
        count: blockedUsers.length,
        limit,
        offset
      },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/blocking', HttpStatus.INTERNAL_SERVER_ERROR, duration);
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
    const user = locals.user;

    if (!user) {
      recordRequest('POST', '/api/blocking', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(
        ErrorCode.AUTH_REQUIRED,
        'Oturum açmanız gerekiyor',
        HttpStatus.UNAUTHORIZED,
        undefined,
        requestId
      );
    }

    const body = await request.json();
    const validation = validateWithSchema(body, blockSchema);

    if (!validation.valid) {
      recordRequest('POST', '/api/blocking', HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Geçersiz giriş',
        HttpStatus.UNPROCESSABLE_ENTITY,
        validation.errors,
        requestId
      );
    }

    if (user.id === validation.data.blocked_id) {
      recordRequest('POST', '/api/blocking', HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Kendinizi engelleyemezsiniz',
        HttpStatus.UNPROCESSABLE_ENTITY,
        undefined,
        requestId
      );
    }

    const block = await blockUser(user.id, validation.data.blocked_id, validation.data.reason);

    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/blocking', HttpStatus.CREATED, duration);
    logger.logMutation('create', 'user_blocks', block.id, user.id, { blocked_id: validation.data.blocked_id });

    return apiResponse(
      {
        success: true,
        data: block,
        message: 'Kullanıcı başarıyla engellendi'
      },
      HttpStatus.CREATED,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/blocking', HttpStatus.INTERNAL_SERVER_ERROR, duration);
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
    const user = locals.user;

    if (!user) {
      recordRequest('DELETE', '/api/blocking', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(
        ErrorCode.AUTH_REQUIRED,
        'Oturum açmanız gerekiyor',
        HttpStatus.UNAUTHORIZED,
        undefined,
        requestId
      );
    }

    const blockedId = url.searchParams.get('blocked_id');

    if (!blockedId) {
      recordRequest('DELETE', '/api/blocking', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Engellenen kullanıcı ID gereklidir',
        HttpStatus.BAD_REQUEST,
        undefined,
        requestId
      );
    }

    const success = await unblockUser(user.id, blockedId);

    if (!success) {
      recordRequest('DELETE', '/api/blocking', HttpStatus.NOT_FOUND, Date.now() - startTime);
      return apiError(
        ErrorCode.NOT_FOUND,
        'Engelleme bulunamadı',
        HttpStatus.NOT_FOUND,
        undefined,
        requestId
      );
    }

    const duration = Date.now() - startTime;
    recordRequest('DELETE', '/api/blocking', HttpStatus.OK, duration);
    logger.logMutation('delete', 'user_blocks', blockedId, user.id, { action: 'unblock' });

    return apiResponse(
      {
        success: true,
        message: 'Engelleme başarıyla kaldırıldı'
      },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('DELETE', '/api/blocking', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Unblock user failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Engelleme kaldırılırken bir hata oluştu',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
