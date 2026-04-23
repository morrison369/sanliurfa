import type { APIRoute } from 'astro';
import { apiError, apiResponse, ErrorCode, getRequestId, HttpStatus } from '../../../../lib/api';
import { query } from '../../../../lib/postgres';
import { enforceApiRateLimit } from '../../../../lib/api-rate-limit';

export const POST: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);

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

  return apiResponse(
    { success: true, data: { matchId, is_active: false } },
    HttpStatus.OK,
    requestId
  );
};
