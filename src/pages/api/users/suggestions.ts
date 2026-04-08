/**
 * User Suggestions
 * GET /api/users/suggestions - Get user suggestions based on interests and activity
 */

import type { APIRoute } from 'astro';
import { queryMany, queryOne } from '../../../lib/postgres';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { logger } from '../../../lib/logging';
import { recordRequest } from '../../../lib/metrics';
import { getCache, setCache } from '../../../lib/cache';

export const GET: APIRoute = async ({ request, locals, url }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    // Auth required
    if (!locals.user) {
      recordRequest('GET', '/api/users/suggestions', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(
        ErrorCode.UNAUTHORIZED,
        'Authentication required',
        HttpStatus.UNAUTHORIZED,
        undefined,
        requestId
      );
    }

    const userId = locals.user.id;
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '10'), 50);
    const cacheKey = `sanliurfa:user:suggestions:${userId}`;

    // Check cache (30 minutes)
    const cached = await getCache(cacheKey);
    if (cached) {
      recordRequest('GET', '/api/users/suggestions', HttpStatus.OK, Date.now() - startTime);
      return apiResponse(JSON.parse(cached), HttpStatus.OK, requestId);
    }

    // Get user's interests (places they've interacted with)
    const userPlaces = await queryMany(
      `SELECT DISTINCT p.category FROM places p
       LEFT JOIN reviews r ON p.id = r.place_id
       LEFT JOIN favorites f ON p.id = f.place_id
       WHERE (r.user_id = $1 OR f.user_id = $1)
       LIMIT 5`,
      [userId]
    );

    const categories = userPlaces.map((p: any) => p.category).filter(Boolean);

    // Find users with similar interests
    // Strategy: Find users who have interacted with similar categories
    let suggestedUsers: any[] = [];

    if (categories.length > 0) {
      suggestedUsers = await queryMany(
        `SELECT DISTINCT u.id, u.full_name, u.username, u.avatar_url,
                (SELECT COUNT(*) FROM followers WHERE follower_id = $1 AND following_id = u.id) as is_following,
                (SELECT COUNT(*) FROM reviews WHERE user_id = u.id) as activity_count,
                (SELECT COUNT(DISTINCT p.category) FROM places p
                 LEFT JOIN reviews r ON p.id = r.place_id
                 WHERE r.user_id = u.id AND p.category = ANY($2)) as matching_interests
         FROM users u
         LEFT JOIN reviews r ON u.id = r.user_id
         LEFT JOIN places p ON r.place_id = p.id
         WHERE u.id != $1
           AND u.id NOT IN (SELECT following_id FROM followers WHERE follower_id = $1)
           AND p.category = ANY($2)
         GROUP BY u.id
         ORDER BY matching_interests DESC, activity_count DESC
         LIMIT $3`,
        [userId, categories, limit]
      );
    }

    // If not enough suggestions, add trending/active users
    if (suggestedUsers.length < limit) {
      const additionalUsers = await queryMany(
        `SELECT u.id, u.full_name, u.username, u.avatar_url,
                (SELECT COUNT(*) FROM followers WHERE follower_id = $1 AND following_id = u.id) as is_following,
                (SELECT COUNT(*) FROM reviews WHERE user_id = u.id) as activity_count
         FROM users u
         WHERE u.id != $1
           AND u.id NOT IN (SELECT following_id FROM followers WHERE follower_id = $1)
           AND u.id NOT IN (${suggestedUsers.map(u => `'${u.id}'`).join(',') || 'NULL'})
         ORDER BY activity_count DESC
         LIMIT $2`,
        [userId, limit - suggestedUsers.length]
      );

      suggestedUsers = [...suggestedUsers, ...additionalUsers];
    }

    const suggestions = suggestedUsers.map((u: any) => ({
      id: u.id,
      name: u.full_name,
      username: u.username,
      avatar: u.avatar_url,
      isFollowing: Boolean(u.is_following),
      activityCount: u.activity_count || 0,
      matchingInterests: u.matching_interests || 0
    }));

    const responseData = {
      success: true,
      suggestions,
      count: suggestions.length
    };

    // Cache for 30 minutes
    await setCache(cacheKey, JSON.stringify(responseData), 1800);

    recordRequest('GET', '/api/users/suggestions', HttpStatus.OK, Date.now() - startTime);

    return apiResponse(responseData, HttpStatus.OK, requestId);
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/users/suggestions', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Failed to get user suggestions', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to get user suggestions',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
