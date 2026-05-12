/**
 * Resend email verification endpoint
 * POST /api/users/resend-verification
 */

import type { APIRoute } from 'astro';
import { requestEmailVerification } from '../../../lib/email';
import { queryOne } from '../../../lib/postgres';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { logger } from '../../../lib/logging';
import { getCache, setCache } from '../../../lib/cache';

const RESEND_LIMIT = 3;
const RESEND_WINDOW_SECONDS = 3600; // 1 saat

export const POST: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId(request);
  try {
    if (!locals.user) {
      return apiError(ErrorCode.UNAUTHORIZED, 'Authentication required', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const userId = locals.user.id;

    // Rate limit: max 3 resends per user per hour
    const rateLimitKey = `email:resend:${userId}`;
    const current = Number(await getCache(rateLimitKey).catch(() => null)) || 0;
    if (current >= RESEND_LIMIT) {
      return apiError(ErrorCode.RATE_LIMITED, '1 saat içinde en fazla 3 doğrulama e-postası gönderilebilir.', HttpStatus.RATE_LIMITED, undefined, requestId);
    }

    const user = await queryOne(
      'SELECT id, email, full_name, email_verified FROM users WHERE id = $1',
      [userId]
    );

    if (!user) {
      return apiError(ErrorCode.NOT_FOUND, 'User not found', HttpStatus.NOT_FOUND, undefined, requestId);
    }

    if (user.email_verified) {
      return apiResponse({ success: true, message: 'Email is already verified', verified: true }, HttpStatus.OK, requestId);
    }

    await setCache(rateLimitKey, current + 1, RESEND_WINDOW_SECONDS).catch(() => null);

    await requestEmailVerification(userId, user.email, user.full_name);

    // HARD RULE #8: log userId only — no PII (email)
    logger.info('Verification email resent', { userId });

    return apiResponse({ success: true, message: 'Verification email sent successfully' }, HttpStatus.OK, requestId);
  } catch (error) {
    logger.error('Resend verification error', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Failed to resend verification email', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
