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
import { validateWithSchema, type ValidationSchema } from '../../../../lib/validation';
import { invalidateUser } from '../../../../lib/cache/invalidation';

type ModerationActionType = 'warning' | 'content_removed' | 'suspend' | 'ban' | 'appeal_granted';

interface ModerationActionBody {
  report_id: string;
  target_user_id: string;
  action_type: ModerationActionType;
  reason: string;
  duration_days?: number;
}

const actionSchema: ValidationSchema = {
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
  const requestId = getRequestId(request);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    const user = locals.user;

    if (!user || !locals.isAdmin) {
      recordRequest('POST', '/api/admin/moderation/actions', HttpStatus.FORBIDDEN, Date.now() - startTime);
      return apiError(
        ErrorCode.FORBIDDEN,
        'Bu işlem için yönetici yetkisi gerekiyor',
        HttpStatus.FORBIDDEN,
        undefined,
        requestId
      );
    }

    const body = (await request.json().catch(() => ({}))) as Partial<ModerationActionBody>;
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

    const data = validation.data as ModerationActionBody;

    // Ban/suspend are system-wide high-impact — admin-only, moderators cannot ban users
    const HIGH_IMPACT_ACTIONS = new Set<ModerationActionType>(['suspend', 'ban']);
    if (HIGH_IMPACT_ACTIONS.has(data.action_type) && user.role !== 'admin') {
      recordRequest('POST', '/api/admin/moderation/actions', HttpStatus.FORBIDDEN, Date.now() - startTime);
      return apiError(
        ErrorCode.FORBIDDEN,
        'Ban/askıya alma işlemi yönetici yetkisi gerektiriyor',
        HttpStatus.FORBIDDEN,
        undefined,
        requestId
      );
    }

    // Ban action requires duration
    if (data.action_type === 'ban' && !data.duration_days) {
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
      data.report_id,
      data.target_user_id,
      data.action_type,
      data.reason,
      user.id,
      data.duration_days
    );

    // Cache invalidation: ban/suspend/warning target user'in profile cache'ini etkiler (session revoke için ayrı kanal)
    await invalidateUser(data.target_user_id);

    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/admin/moderation/actions', HttpStatus.CREATED, duration);
    logger.logMutation('create', 'moderation_actions', action.id, user.id);

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
  const requestId = getRequestId(request);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    const user = locals.user;

    if (!user || !locals.isAdmin) {
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
