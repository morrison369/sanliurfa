/**
 * Admin Moderation Actions API
 * POST: Take moderation action on a user or content
 * GET: Get moderation action history
 */

import type { APIRoute } from 'astro';
import { takeModerationAction, getUserBanHistory } from '../../../../lib/moderation';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../lib/api';
import { recordRequest } from '../../../../lib/metrics';
import { logger } from '../../../../lib/logging';
import { validateWithSchema } from '../../../../lib/validation';

const actionSchema = {
  report_id: {
    type: 'string' as const,
    required: true
  },
  target_user_id: {
    type: 'string' as const,
    required: true
  },
  action_type: {
    type: 'string' as const,
    required: true,
    pattern: '^(warning|content_removed|suspend|ban|appeal_granted)$'
  },
  reason: {
    type: 'string' as const,
    required: true,
    maxLength: 500,
    sanitize: true
  },
  duration_days: {
    type: 'number' as const,
    required: false,
    min: 1,
    max: 365
  }
};

export const POST: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    const user = locals.user;

    if (!user || !user.isAdmin) {
      recordRequest('POST', '/api/admin/moderation/actions', HttpStatus.FORBIDDEN, Date.now() - startTime);
      return apiError(
        ErrorCode.FORBIDDEN,
        'Bu işlem için yönetici yetkisi gerekiyor',
        HttpStatus.FORBIDDEN,
        undefined,
        requestId
      );
    }

    const body = await request.json();
    const validation = validateWithSchema(body, actionSchema);

    if (!validation.valid) {
      recordRequest('POST', '/api/admin/moderation/actions', HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Geçersiz giriş',
        HttpStatus.UNPROCESSABLE_ENTITY,
        validation.errors,
        requestId
      );
    }

    // Ban action requires duration
    if (validation.data.action_type === 'ban' && !validation.data.duration_days) {
      recordRequest('POST', '/api/admin/moderation/actions', HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Ban işlemi için duration gereklidir',
        HttpStatus.UNPROCESSABLE_ENTITY,
        undefined,
        requestId
      );
    }

    const action = await takeModerationAction(
      validation.data.report_id,
      validation.data.target_user_id,
      validation.data.action_type,
      validation.data.reason,
      user.id,
      validation.data.duration_days
    );

    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/admin/moderation/actions', HttpStatus.CREATED, duration);
    logger.logMutation('create', 'moderation_actions', action.id, user.id, {
      action_type: validation.data.action_type,
      target_user: validation.data.target_user_id
    });

    return apiResponse(
      {
        success: true,
        data: action
      },
      HttpStatus.CREATED,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/admin/moderation/actions', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Take action failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'İşlem gerçekleştirilirken bir hata oluştu',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};

export const GET: APIRoute = async ({ request, locals, url }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    const user = locals.user;

    if (!user || !user.isAdmin) {
      recordRequest('GET', '/api/admin/moderation/actions', HttpStatus.FORBIDDEN, Date.now() - startTime);
      return apiError(
        ErrorCode.FORBIDDEN,
        'Bu işlem için yönetici yetkisi gerekiyor',
        HttpStatus.FORBIDDEN,
        undefined,
        requestId
      );
    }

    const userId = url.searchParams.get('user_id');

    if (!userId) {
      recordRequest('GET', '/api/admin/moderation/actions', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Kullanıcı ID gereklidir',
        HttpStatus.BAD_REQUEST,
        undefined,
        requestId
      );
    }

    const banHistory = await getUserBanHistory(userId);

    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/admin/moderation/actions', HttpStatus.OK, duration);

    return apiResponse(
      {
        success: true,
        data: banHistory,
        count: banHistory.length
      },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/admin/moderation/actions', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Get actions failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'İşlemler alınırken bir hata oluştu',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
