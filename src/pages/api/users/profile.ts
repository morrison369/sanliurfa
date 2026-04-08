/**
 * User Profile API
 * GET: Get user profile
 * PUT: Update user profile (bio, avatar, username)
 */

import type { APIRoute } from 'astro';
import { getUserProfile, updateUserProfile } from '../../../lib/users';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { recordRequest } from '../../../lib/metrics';
import { logger } from '../../../lib/logging';
import { validateWithSchema } from '../../../lib/validation';

const updateProfileSchema = {
  full_name: {
    type: 'string' as const,
    required: false,
    minLength: 2,
    maxLength: 255,
    sanitize: true
  },
  username: {
    type: 'string' as const,
    required: false,
    minLength: 3,
    maxLength: 50,
    pattern: '^[a-zA-Z0-9_-]+$'
  },
  avatar_url: {
    type: 'string' as const,
    required: false,
    maxLength: 500
  },
  bio: {
    type: 'string' as const,
    required: false,
    maxLength: 500,
    sanitize: true
  }
};

export const GET: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    const user = locals.user;

    if (!user) {
      recordRequest('GET', '/api/users/profile', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(
        ErrorCode.AUTH_REQUIRED,
        'Oturum açmanız gerekiyor',
        HttpStatus.UNAUTHORIZED,
        undefined,
        requestId
      );
    }

    const profile = await getUserProfile(user.id);

    if (!profile) {
      recordRequest('GET', '/api/users/profile', HttpStatus.NOT_FOUND, Date.now() - startTime);
      return apiError(
        ErrorCode.NOT_FOUND,
        'Profil bulunamadı',
        HttpStatus.NOT_FOUND,
        undefined,
        requestId
      );
    }

    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/users/profile', HttpStatus.OK, duration);

    return apiResponse(
      {
        success: true,
        data: profile
      },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/users/profile', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Get profile failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Profil alınırken bir hata oluştu',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};

export const PUT: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    const user = locals.user;

    if (!user) {
      recordRequest('PUT', '/api/users/profile', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(
        ErrorCode.AUTH_REQUIRED,
        'Oturum açmanız gerekiyor',
        HttpStatus.UNAUTHORIZED,
        undefined,
        requestId
      );
    }

    const body = await request.json();
    const validation = validateWithSchema(body, updateProfileSchema);

    if (!validation.valid) {
      recordRequest('PUT', '/api/users/profile', HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Geçersiz giriş',
        HttpStatus.UNPROCESSABLE_ENTITY,
        validation.errors,
        requestId
      );
    }

    const updates = {
      full_name: validation.data.full_name,
      username: validation.data.username,
      avatar_url: validation.data.avatar_url,
      bio: validation.data.bio
    };

    // Remove undefined values
    Object.keys(updates).forEach(key => updates[key as keyof typeof updates] === undefined && delete updates[key as keyof typeof updates]);

    if (Object.keys(updates).length === 0) {
      recordRequest('PUT', '/api/users/profile', HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Güncellenecek bir alan belirtin',
        HttpStatus.UNPROCESSABLE_ENTITY,
        undefined,
        requestId
      );
    }

    const updatedProfile = await updateUserProfile(user.id, updates);

    const duration = Date.now() - startTime;
    recordRequest('PUT', '/api/users/profile', HttpStatus.OK, duration);
    logger.logMutation('update', 'users', user.id, user.id, { fields: Object.keys(updates) });

    return apiResponse(
      {
        success: true,
        data: updatedProfile
      },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('PUT', '/api/users/profile', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Update profile failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Profil güncellenirken bir hata oluştu',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
