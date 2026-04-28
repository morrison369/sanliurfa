/**
 * Admin: User Subscription Management
 * GET /api/admin/subscriptions/users - List users with subscriptions
 * POST /api/admin/subscriptions/users/[userId] - Manage user subscription
 */

import type { APIRoute } from 'astro';
import { queryMany, queryOne } from '../../../../lib/postgres';
import { getUserSubscriptionDetails, changeUserTier } from '../../../../lib/subscription/subscription-admin';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId, safeIntParam } from '../../../../lib/api';
import { logger } from '../../../../lib/logging';
import { recordRequest } from '../../../../lib/metrics';
import { validateWithSchema, type ValidationSchema } from '../../../../lib/validation';

type ChangeTierPayload = {
  newTierId: string;
  reason?: string;
};

const changeTierSchema: ValidationSchema = {
  newTierId: {
    type: 'string',
    required: true,
    minLength: 36,
    maxLength: 36,
  },
  reason: {
    type: 'string',
    required: false,
    maxLength: 500,
  },
};

// GET - List users with subscriptions
export const GET: APIRoute = async ({ request, locals, url }) => {
  const requestId = getRequestId(request);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (locals.user?.role !== 'admin') {
      recordRequest('GET', '/api/admin/subscriptions/users', HttpStatus.FORBIDDEN, Date.now() - startTime);
      return apiError(
        ErrorCode.FORBIDDEN,
        'Admin yetkisi gerekli',
        HttpStatus.FORBIDDEN,
        undefined,
        requestId
      );
    }

    const search = url.searchParams.get('search');
    const tier = url.searchParams.get('tier');
    const status = url.searchParams.get('status') || 'active';
    const requestedLimit = safeIntParam(url.searchParams.get('limit'), 50, 0, 1_000_000);

    if (search !== undefined && search !== null && (typeof search !== 'string' || search.length > 200)) return apiError(ErrorCode.VALIDATION_ERROR, 'search 200 karakterden uzun olamaz', HttpStatus.BAD_REQUEST, undefined, requestId);
    if (tier !== undefined && tier !== null && (typeof tier !== 'string' || tier.length > 100)) return apiError(ErrorCode.VALIDATION_ERROR, 'tier 100 karakterden uzun olamaz', HttpStatus.BAD_REQUEST, undefined, requestId);
    const VALID_SUB_STATUSES = new Set(['active', 'cancelled', 'expired', 'trialing', 'past_due']);
    if (!VALID_SUB_STATUSES.has(status)) return apiError(ErrorCode.VALIDATION_ERROR, 'Geçersiz abonelik durumu', HttpStatus.BAD_REQUEST, undefined, requestId);
    const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 100) : 50;

    let sql = `SELECT u.id, u.email, u.full_name, s.id as subscription_id, st.display_name as tier, s.status, s.created_at
               FROM users u
               LEFT JOIN subscriptions s ON u.id = s.user_id AND s.status = $1
               LEFT JOIN subscription_tiers st ON s.tier_id = st.id
               WHERE 1=1`;

    const params: Array<string | number> = [status];
    let paramCount = 2;

    if (search) {
      sql += ` AND (u.email ILIKE $${paramCount} OR u.full_name ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }

    if (tier) {
      sql += ` AND st.name = $${paramCount}`;
      params.push(tier);
      paramCount++;
    }

    sql += ` ORDER BY s.created_at DESC LIMIT $${paramCount}`;
    params.push(limit);

    const results = await queryMany(sql, params);

    recordRequest('GET', '/api/admin/subscriptions/users', HttpStatus.OK, Date.now() - startTime);

    return apiResponse(
      {
        success: true,
        users: results,
        count: results.length,
      },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/admin/subscriptions/users', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Kullanıcı abonelik listesi alınamadı', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Kullanıcılar alınamadı',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};

// POST - Manage user subscription
export const POST: APIRoute = async ({ request, locals, url }) => {
  const requestId = getRequestId(request);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (locals.user?.role !== 'admin') {
      recordRequest('POST', '/api/admin/subscriptions/users', HttpStatus.FORBIDDEN, Date.now() - startTime);
      return apiError(
        ErrorCode.FORBIDDEN,
        'Admin yetkisi gerekli',
        HttpStatus.FORBIDDEN,
        undefined,
        requestId
      );
    }

    const userId = url.searchParams.get('userId');
    if (!userId || userId.length !== 36) {
      recordRequest('POST', '/api/admin/subscriptions/users', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Kullanıcı ID geçersiz',
        HttpStatus.BAD_REQUEST,
        undefined,
        requestId
      );
    }

    const action = url.searchParams.get('action');

    if (action === 'change_tier') {
      // Change user tier
      const body = await request.json();
      const validation = validateWithSchema(body, changeTierSchema);

      if (!validation.valid) {
        recordRequest('POST', '/api/admin/subscriptions/users', HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
        return apiError(
          ErrorCode.VALIDATION_ERROR,
          'Girdi geçersiz',
          HttpStatus.UNPROCESSABLE_ENTITY,
          validation.errors,
          requestId
        );
      }

      const { newTierId, reason } = validation.data as ChangeTierPayload;

      // Verify tier exists
      const tier = await queryOne('SELECT id FROM subscription_tiers WHERE id = $1', [newTierId]);
      if (!tier) {
        recordRequest('POST', '/api/admin/subscriptions/users', HttpStatus.NOT_FOUND, Date.now() - startTime);
        return apiError(
          ErrorCode.NOT_FOUND,
          'Abonelik paketi bulunamadı',
          HttpStatus.NOT_FOUND,
          undefined,
          requestId
        );
      }

      // Change tier
      const success = await changeUserTier(locals.user!.id, userId, newTierId, reason);

      if (!success) {
        recordRequest('POST', '/api/admin/subscriptions/users', HttpStatus.BAD_REQUEST, Date.now() - startTime);
        return apiError(
          ErrorCode.INVALID_INPUT,
          'Aktif abonelik bulunamadı',
          HttpStatus.BAD_REQUEST,
          undefined,
          requestId
        );
      }

      recordRequest('POST', '/api/admin/subscriptions/users', HttpStatus.OK, Date.now() - startTime);

      return apiResponse(
        {
          success: true,
          message: 'Kullanıcı abonelik paketi güncellendi',
        },
        HttpStatus.OK,
        requestId
      );
    }

    if (action === 'get_details') {
      // Get user subscription details
      const details = await getUserSubscriptionDetails(userId);

      if (!details) {
        recordRequest('POST', '/api/admin/subscriptions/users', HttpStatus.NOT_FOUND, Date.now() - startTime);
        return apiError(
          ErrorCode.NOT_FOUND,
          'Kullanıcı veya abonelik bulunamadı',
          HttpStatus.NOT_FOUND,
          undefined,
          requestId
        );
      }

      recordRequest('POST', '/api/admin/subscriptions/users', HttpStatus.OK, Date.now() - startTime);

      return apiResponse(
        {
          success: true,
          data: details,
        },
        HttpStatus.OK,
        requestId
      );
    }

    recordRequest('POST', '/api/admin/subscriptions/users', HttpStatus.BAD_REQUEST, Date.now() - startTime);
    return apiError(
      ErrorCode.INVALID_INPUT,
      'İşlem geçersiz',
      HttpStatus.BAD_REQUEST,
      undefined,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/admin/subscriptions/users', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Kullanıcı aboneliği yönetilemedi', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Kullanıcı aboneliği yönetilemedi',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
