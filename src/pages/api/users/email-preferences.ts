import type { APIRoute } from 'astro';
import { queryOne, query } from '../../../lib/postgres';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { recordRequest } from '../../../lib/metrics';
import { logger } from '../../../lib/logging';
import { deleteCache } from '../../../lib/cache';

export const GET: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId(request);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    const user = locals.user;
    if (!user) {
      recordRequest('GET', '/api/users/email-preferences', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(ErrorCode.UNAUTHORIZED, 'Oturum açmanız gerekiyor', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const result = await queryOne(
      'SELECT notification_preferences FROM users WHERE id = $1',
      [user.id]
    );

    const prefs = result?.notification_preferences || {
      email_new_message: true,
      email_new_follower: true,
      email_place_review: true,
      email_weekly_digest: true
    };

    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/users/email-preferences', HttpStatus.OK, duration);

    return apiResponse({ success: true, data: prefs }, HttpStatus.OK, requestId);
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/users/email-preferences', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Get email preferences failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Tercihler alınırken hata oluştu', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};

export const PUT: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId(request);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    const user = locals.user;
    if (!user) {
      recordRequest('PUT', '/api/users/email-preferences', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(ErrorCode.UNAUTHORIZED, 'Oturum açmanız gerekiyor', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const body = await request.json();

    // HARD RULE #51-style: allowlist keys before JSONB merge to prevent arbitrary field injection
    const ALLOWED_PREF_KEYS = new Set(['email_new_message', 'email_new_follower', 'email_place_review', 'email_weekly_digest', 'email_promotions', 'push_notifications']);
    const prefs: Record<string, boolean> = {};
    for (const [key, val] of Object.entries(body)) {
      if (ALLOWED_PREF_KEYS.has(key) && typeof val === 'boolean') {
        prefs[key] = val;
      }
    }

    if (Object.keys(prefs).length === 0) {
      return apiError(ErrorCode.VALIDATION_ERROR, 'Geçerli tercih alanı bulunamadı', HttpStatus.UNPROCESSABLE_ENTITY, undefined, requestId);
    }

    // Update notification_preferences JSONB
    await query(
      'UPDATE users SET notification_preferences = notification_preferences || $1 WHERE id = $2',
      [JSON.stringify(prefs), user.id]
    );

    await deleteCache('user:' + user.id);

    const duration = Date.now() - startTime;
    recordRequest('PUT', '/api/users/email-preferences', HttpStatus.OK, duration);
    logger.logMutation('update', 'users', user.id, user.id, { action: 'update_email_prefs' });

    return apiResponse({ success: true, message: 'Tercihler güncellendi' }, HttpStatus.OK, requestId);
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('PUT', '/api/users/email-preferences', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Update email preferences failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Tercihler güncellenirken hata oluştu', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};

