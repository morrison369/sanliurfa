/**
 * GET /api/auth/me — Current authenticated user data
 */

import type { APIRoute } from 'astro';
import { queryOne } from '../../../lib/postgres';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { logger } from '../../../lib/logger';

export const GET: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId(request);

  try {
    if (!locals.user?.id) {
      return apiError(ErrorCode.UNAUTHORIZED, 'Kimlik doğrulama gerekli', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const user = await queryOne(
      `SELECT id, email, full_name, username, role, avatar_url, bio,
              email_verified, status, created_at, updated_at
       FROM users WHERE id = $1 AND status != 'deleted'`,
      [locals.user.id]
    );

    if (!user) {
      return apiError(ErrorCode.NOT_FOUND, 'Kullanıcı bulunamadı', HttpStatus.NOT_FOUND, undefined, requestId);
    }

    return apiResponse(user, HttpStatus.OK, requestId);
  } catch (error) {
    logger.error('GET /api/auth/me failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Kullanıcı bilgisi alınamadı', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
