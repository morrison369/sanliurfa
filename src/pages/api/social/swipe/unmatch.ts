import type { APIRoute } from 'astro';
import { apiError, apiResponse, ErrorCode, getRequestId, HttpStatus } from '../../../../lib/api';
import { query } from '../../../../lib/postgres';
import { enforceApiRateLimit } from '../../../../lib/api-rate-limit';
import { isSocialMatchingEnabled } from '../../../../lib/feature-flags';

export const POST: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  if (!isSocialMatchingEnabled()) {
    return apiError(
      ErrorCode.SERVICE_UNAVAILABLE,
      'Sosyal eşleşme modülü şu anda bakımda.',
      HttpStatus.SERVICE_UNAVAILABLE,
      undefined,
      requestId
    );
  }

  if (!locals.user?.id) {
    return apiError(ErrorCode.AUTH_REQUIRED, 'Oturum açmanız gerekiyor', HttpStatus.UNAUTHORIZED, undefined, requestId);
  }

  const isAllowed = await enforceApiRateLimit(request, 'social:swipe:unmatch', 40, 15 * 60, locals.user.id);
  if (!isAllowed) {
    return apiError(
      ErrorCode.RATE_LIMITED,
      'Çok sık eşleşme kaldırıyorsunuz. Lütfen kısa süre sonra tekrar deneyin.',
      HttpStatus.RATE_LIMITED,
      undefined,
      requestId
    );
  }

  const body = await request.json();
  const matchId = Number.parseInt(String(body?.matchId || ''), 10);
  if (!Number.isFinite(matchId) || matchId <= 0) {
    return apiError(
      ErrorCode.VALIDATION_ERROR,
      'Geçerli bir matchId gönderin.',
      HttpStatus.UNPROCESSABLE_ENTITY,
      undefined,
      requestId
    );
  }

  const result = await query(
    `UPDATE social_matches
     SET is_active = FALSE
     WHERE id = $1 AND (user_a = $2 OR user_b = $2) AND is_active = TRUE`,
    [matchId, locals.user.id]
  );

  if ((result.rowCount || 0) === 0) {
    return apiError(
      ErrorCode.NOT_FOUND,
      'Aktif eşleşme bulunamadı.',
      HttpStatus.NOT_FOUND,
      undefined,
      requestId
    );
  }

  const reason = typeof body?.reason === 'string' ? body.reason.trim().slice(0, 500) : '';
  await query(
    `INSERT INTO social_match_moderation_logs (match_id, actor_user_id, action, reason, metadata)
     VALUES ($1, $2, 'unmatch_by_user', $3, $4::jsonb)`,
    [matchId, locals.user.id, reason || null, JSON.stringify({ source: 'user-ui' })]
  );

  return apiResponse(
    { success: true, data: { matchId, is_active: false } },
    HttpStatus.OK,
    requestId
  );
};
