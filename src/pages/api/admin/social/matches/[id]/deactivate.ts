import type { APIRoute } from 'astro';
import { apiError, apiResponse, ErrorCode, getRequestId, HttpStatus } from '../../../../../../lib/api';
import { query } from '../../../../../../lib/postgres';
import { enforceApiRateLimit } from '../../../../../../lib/api-rate-limit';

export const POST: APIRoute = async ({ request, locals, params }) => {
  const requestId = getRequestId({ request } as any);
  const isAdmin = Boolean(locals.isAdmin || locals.user?.role === 'admin');

  if (!locals.user?.id || !isAdmin) {
    return apiError(ErrorCode.FORBIDDEN, 'Admin yetkisi gerekiyor.', HttpStatus.FORBIDDEN, undefined, requestId);
  }

  const isAllowed = await enforceApiRateLimit(request, 'admin:social:match:deactivate', 80, 15 * 60, locals.user.id);
  if (!isAllowed) {
    return apiError(
      ErrorCode.RATE_LIMITED,
      'Çok sık moderasyon işlemi yapıyorsunuz. Lütfen kısa süre sonra tekrar deneyin.',
      HttpStatus.RATE_LIMITED,
      undefined,
      requestId
    );
  }

  const matchId = Number.parseInt(String(params.id || ''), 10);
  if (!Number.isFinite(matchId) || matchId <= 0) {
    return apiError(ErrorCode.VALIDATION_ERROR, 'Geçerli bir eşleşme ID gönderin.', HttpStatus.UNPROCESSABLE_ENTITY, undefined, requestId);
  }

  const body = await request.json().catch(() => ({}));
  const reason = typeof body?.reason === 'string' ? body.reason.trim() : '';
  if (reason.length < 10) {
    return apiError(
      ErrorCode.VALIDATION_ERROR,
      'Moderasyon gerekçesi en az 10 karakter olmalı.',
      HttpStatus.UNPROCESSABLE_ENTITY,
      undefined,
      requestId
    );
  }

  const result = await query(
    `UPDATE social_matches
     SET is_active = FALSE
     WHERE id = $1`,
    [matchId]
  );

  if ((result.rowCount || 0) === 0) {
    return apiError(ErrorCode.NOT_FOUND, 'Eşleşme bulunamadı.', HttpStatus.NOT_FOUND, undefined, requestId);
  }

  await query(
    `INSERT INTO social_match_moderation_logs (match_id, actor_user_id, action, reason, metadata)
     VALUES ($1, $2, 'deactivate_by_admin', $3, $4::jsonb)`,
    [matchId, locals.user.id, reason.slice(0, 500), JSON.stringify({ source: 'admin-panel' })]
  );

  return apiResponse({ success: true, data: { id: matchId, is_active: false } }, HttpStatus.OK, requestId);
};
