/**
 * User Profile API
 * GET: Retrieve user profile information
 */

import type { APIRoute } from 'astro';
import { queryOne } from '../../../lib/postgres';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { recordRequest } from '../../../lib/metrics';
import { logger } from '../../../lib/logging';
import { getCache, setCache } from '../../../lib/cache';

export const GET: APIRoute = async ({ request, params }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    const { id } = params;

    if (!id) {
      recordRequest('GET', '/api/users/:id', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Kullanıcı ID gereklidir',
        HttpStatus.BAD_REQUEST,
        undefined,
        requestId
      );
    }

    // Check cache first
    const cacheKey = `sanliurfa:user:profile:${id}`;
    const cached = await getCache<any>(cacheKey);
    if (cached) {
      const duration = Date.now() - startTime;
      recordRequest('GET', `/api/users/${id}`, HttpStatus.OK, duration);
      return apiResponse(
        {
          success: true,
          data: cached
        },
        HttpStatus.OK,
        requestId,
        { 'X-Cache': 'HIT' }
      );
    }

    // Get user profile
    const user = await queryOne(
      `SELECT
        id,
        full_name,
        username,
        avatar_url,
        bio,
        points,
        level,
        created_at,
        role
      FROM users
      WHERE id = $1`,
      [id]
    );

    if (!user) {
      recordRequest('GET', `/api/users/${id}`, HttpStatus.NOT_FOUND, Date.now() - startTime);
      return apiError(
        ErrorCode.NOT_FOUND,
        'Kullanıcı bulunamadı',
        HttpStatus.NOT_FOUND,
        undefined,
        requestId
      );
    }

    // Get user stats
    const stats = await queryOne(
      `SELECT
        COUNT(CASE WHEN action_type = 'review_created' THEN 1 END) as review_count,
        COUNT(CASE WHEN action_type = 'favorite_added' THEN 1 END) as favorite_count,
        COUNT(CASE WHEN action_type = 'comment_posted' THEN 1 END) as comment_count,
        COUNT(CASE WHEN action_type = 'badge_earned' THEN 1 END) as badge_count
      FROM user_activity
      WHERE user_id = $1`,
      [id]
    );

    // Format response
    const profileData = {
      id: user.id,
      full_name: user.full_name,
      username: user.username,
      avatar_url: user.avatar_url,
      bio: user.bio,
      points: user.points,
      level: user.level,
      created_at: user.created_at,
      stats: {
        reviews: parseInt(stats?.review_count || '0'),
        favorites: parseInt(stats?.favorite_count || '0'),
        comments: parseInt(stats?.comment_count || '0'),
        badges: parseInt(stats?.badge_count || '0')
      }
    };

    // Cache for 10 minutes
    await setCache(cacheKey, profileData, 600);

    const duration = Date.now() - startTime;
    recordRequest('GET', `/api/users/${id}`, HttpStatus.OK, duration);

    return apiResponse(
      {
        success: true,
        data: profileData
      },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', `/api/users/${params.id}`, HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Get user profile failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Kullanıcı profili alınırken bir hata oluştu',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
