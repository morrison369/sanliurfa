/**
 * Trending Users
 * GET /api/users/trending - Get most active and popular users
 */

import type { APIRoute } from 'astro';
import { queryMany } from '../../../lib/postgres';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { logger } from '../../../lib/logging';
import { recordRequest } from '../../../lib/metrics';
import { getCache, setCache } from '../../../lib/cache';

export const GET: APIRoute = async ({ request, url }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '15'), 50);
    const period = url.searchParams.get('period') || '30'; // days
    const cacheKey = `sanliurfa:users:trending:${period}`;

    // Check cache (1 hour)
    const cached = await getCache(cacheKey);
    if (cached) {
      recordRequest('GET', '/api/users/trending', HttpStatus.OK, Date.now() - startTime);
      return apiResponse(JSON.parse(cached), HttpStatus.OK, requestId);
    }

    // Validate period
    const validPeriods = ['7', '30', '90'];
    const safePeriod = validPeriods.includes(period) ? period : '30';

    // Get trending users by activity in specified period
    const trendingUsers = await queryMany(
      `SELECT u.id, u.full_name, u.username, u.avatar_url,
              (SELECT COUNT(*) FROM reviews WHERE user_id = u.id AND created_at >= NOW() - (CAST($1 AS INTEGER) || ' days')::INTERVAL) as review_count,
              (SELECT COUNT(*) FROM comments WHERE user_id = u.id AND created_at >= NOW() - (CAST($1 AS INTEGER) || ' days')::INTERVAL) as comment_count,
              (SELECT COUNT(*) FROM favorites WHERE user_id = u.id AND created_at >= NOW() - (CAST($1 AS INTEGER) || ' days')::INTERVAL) as favorite_count,
              (SELECT COUNT(*) FROM followers WHERE following_id = u.id) as follower_count,
              (SELECT COUNT(DISTINCT p.category) FROM places p
               LEFT JOIN reviews r ON p.id = r.place_id
               WHERE r.user_id = u.id) as expertise_count
       FROM users u
       WHERE u.created_at < NOW() - INTERVAL '7 days'
       ORDER BY (
         (SELECT COUNT(*) FROM reviews WHERE user_id = u.id AND created_at >= NOW() - (CAST($1 AS INTEGER) || ' days')::INTERVAL) * 2 +
         (SELECT COUNT(*) FROM comments WHERE user_id = u.id AND created_at >= NOW() - (CAST($1 AS INTEGER) || ' days')::INTERVAL) +
         (SELECT COUNT(*) FROM followers WHERE following_id = u.id) * 0.5
       ) DESC
       LIMIT $2`,
      [safePeriod, limit]
    );

    const users = trendingUsers.map((u: any) => ({
      id: u.id,
      name: u.full_name,
      username: u.username,
      avatar: u.avatar_url,
      recentActivity: {
        reviews: u.review_count || 0,
        comments: u.comment_count || 0,
        favorites: u.favorite_count || 0
      },
      followers: u.follower_count || 0,
      expertise: u.expertise_count || 0
    }));

    const responseData = {
      success: true,
      period: `${period} gün`,
      users,
      count: users.length
    };

    // Cache for 1 hour
    await setCache(cacheKey, JSON.stringify(responseData), 3600);

    recordRequest('GET', '/api/users/trending', HttpStatus.OK, Date.now() - startTime);

    return apiResponse(responseData, HttpStatus.OK, requestId);
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/users/trending', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Failed to get trending users', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to get trending users',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
