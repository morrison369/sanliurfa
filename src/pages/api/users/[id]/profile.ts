/**
 * User Public Profile API
 * GET: Get public user profile information
 */

import type { APIRoute } from 'astro';
import { getUserProfile } from '../../../../lib/users';
import { getFollowerStats, isFollowing } from '../../../../lib/followers';
import { queryOne, queryMany } from '../../../../lib/postgres';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../lib/api';
import { recordRequest } from '../../../../lib/metrics';
import { logger } from '../../../../lib/logging';

export const GET: APIRoute = async ({ request, locals, params }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    const { id } = params;

    if (!id) {
      recordRequest('GET', '/api/users/[id]/profile', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Kullanıcı ID gereklidir',
        HttpStatus.BAD_REQUEST,
        undefined,
        requestId
      );
    }

    // Get user profile
    const userProfile = await getUserProfile(id);

    if (!userProfile) {
      recordRequest('GET', '/api/users/[id]/profile', HttpStatus.NOT_FOUND, Date.now() - startTime);
      return apiError(
        ErrorCode.NOT_FOUND,
        'Kullanıcı bulunamadı',
        HttpStatus.NOT_FOUND,
        undefined,
        requestId
      );
    }

    // Check privacy settings - if profile is not public and viewing user is not the owner
    const currentUserId = locals.user?.id;
    const isOwnProfile = currentUserId === id;

    if (!userProfile.privacy_settings?.profile_public && !isOwnProfile) {
      recordRequest('GET', '/api/users/[id]/profile', HttpStatus.FORBIDDEN, Date.now() - startTime);
      return apiError(
        ErrorCode.FORBIDDEN,
        'Bu profil özel ayarlanmıştır',
        HttpStatus.FORBIDDEN,
        undefined,
        requestId
      );
    }

    // Get follower stats
    const stats = await getFollowerStats(id);

    // Check if current user follows this user
    let isFollowingUser = false;
    if (currentUserId && currentUserId !== id) {
      isFollowingUser = await isFollowing(currentUserId, id);
    }

    // Get recent activity (last 5 comments and reviews)
    const recentActivity = await queryMany(
      `(SELECT 'comment' as type, id, content, created_at FROM comments WHERE user_id = $1 AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 3)
       UNION ALL
       (SELECT 'review' as type, id, content, created_at FROM reviews WHERE user_id = $1 ORDER BY created_at DESC LIMIT 3)
       ORDER BY created_at DESC LIMIT 6`,
      [id]
    );

    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/users/[id]/profile', HttpStatus.OK, duration);

    // Format public profile response (hide sensitive data)
    const publicProfile = {
      id: userProfile.id,
      full_name: userProfile.full_name,
      username: userProfile.username,
      avatar_url: userProfile.avatar_url,
      bio: userProfile.bio,
      points: userProfile.points,
      level: userProfile.level,
      language_preference: userProfile.language_preference,
      email_verified: userProfile.email_verified,
      created_at: userProfile.created_at,
      last_login_at: userProfile.last_login_at,
      // Show email only if privacy setting allows it
      email: userProfile.privacy_settings?.show_email && (isOwnProfile || currentUserId) ? userProfile.email : undefined,
      stats: {
        followers: stats.follower_count,
        following: stats.following_count,
        mutual: stats.mutual_friends_count
      },
      is_following: isFollowingUser,
      is_own_profile: isOwnProfile,
      allow_messages: userProfile.privacy_settings?.allow_messages !== false,
      recent_activity: recentActivity.rows.map((row: any) => ({
        type: row.type,
        id: row.id,
        content: row.content.substring(0, 100) + (row.content.length > 100 ? '...' : ''),
        created_at: row.created_at
      }))
    };

    return apiResponse(
      {
        success: true,
        data: publicProfile
      },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/users/[id]/profile', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Get user profile failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Profil alınırken bir hata oluştu',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
