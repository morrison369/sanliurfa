/**
 * GET /api/user/profile — Current user's profile (singular alias for /api/users/profile)
 * PUT /api/user/profile — Update profile
 */

import type { APIRoute } from 'astro';
import { getUserProfile, updateUserProfile } from '../../../lib/user';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { logger } from '../../../lib/logger';

export const GET: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId(request);

  try {
    if (!locals.user?.id) {
      return apiError(ErrorCode.UNAUTHORIZED, 'Kimlik doğrulama gerekli', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const profile = await getUserProfile(locals.user.id);
    if (!profile) {
      return apiError(ErrorCode.NOT_FOUND, 'Profil bulunamadı', HttpStatus.NOT_FOUND, undefined, requestId);
    }

    return apiResponse(profile, HttpStatus.OK, requestId);
  } catch (error) {
    logger.error('Failed to get user profile', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Profil alınamadı', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};

export const PUT: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId(request);

  try {
    if (!locals.user?.id) {
      return apiError(ErrorCode.UNAUTHORIZED, 'Kimlik doğrulama gerekli', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const body = await request.json();
    await updateUserProfile(locals.user.id, body);
    const profile = await getUserProfile(locals.user.id);

    return apiResponse(profile, HttpStatus.OK, requestId);
  } catch (error) {
    logger.error('Failed to update user profile', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Profil güncellenemedi', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
