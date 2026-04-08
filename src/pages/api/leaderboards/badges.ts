/**
 * Badge Leaderboards API
 * GET: Retrieve users by badge achievements and earned badges
 */

import type { APIRoute } from 'astro';
import { queryMany } from '../../../lib/postgres';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { recordRequest } from '../../../lib/metrics';
import { logger } from '../../../lib/logging';
import { getCache, setCache } from '../../../lib/cache';

export const GET: APIRoute = async ({ request, url }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    // Get query parameters
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);

    // Check cache
    const cacheKey = `sanliurfa:leaderboard:badges:${limit}`;
    const cached = await getCache<any[]>(cacheKey);
    if (cached) {
      const duration = Date.now() - startTime;
      recordRequest('GET', '/api/leaderboards/badges', HttpStatus.OK, duration);
      return apiResponse(
        {
          success: true,
          data: cached,
          count: cached.length
        },
        HttpStatus.OK,
        requestId,
        { 'X-Cache': 'HIT' }
      );
    }

    // Get users with badge achievements
    const sql = `
      SELECT
        u.id,
        u.full_name,
        u.username,
        u.avatar_url,
        u.points,
        u.level,
        COUNT(DISTINCT CASE WHEN ua.action_type = 'badge_earned' THEN ua.metadata->>'badgeName' END) as badge_count,
        COUNT(DISTINCT CASE WHEN ua.action_type = 'badge_earned' THEN ua.id END) as total_badges_earned,
        ARRAY_AGG(DISTINCT ua.metadata->>'badgeName' FILTER (WHERE ua.action_type = 'badge_earned')) as badges,
        MAX(CASE WHEN ua.action_type = 'badge_earned' THEN ua.created_at END) as last_badge_earned
      FROM users u
      LEFT JOIN user_activity ua ON u.id = ua.user_id
      WHERE u.role = 'user'
      GROUP BY u.id
      HAVING COUNT(DISTINCT CASE WHEN ua.action_type = 'badge_earned' THEN ua.id END) > 0
      ORDER BY badge_count DESC, total_badges_earned DESC, u.points DESC
      LIMIT $1
    `;

    const result = await queryMany(sql, [limit]);

    // Format response with ranks
    const leaderboard = result.rows.map((row: any, index: number) => ({
      rank: index + 1,
      id: row.id,
      full_name: row.full_name,
      username: row.username,
      avatar_url: row.avatar_url,
      points: row.points,
      level: row.level,
      badge_count: parseInt(row.badge_count || '0'),
      total_badges_earned: parseInt(row.total_badges_earned || '0'),
      badges: row.badges ? row.badges.filter((b: any) => b) : [],
      last_badge_earned: row.last_badge_earned
    }));

    // Cache for 10 minutes
    await setCache(cacheKey, leaderboard, 600);

    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/leaderboards/badges', HttpStatus.OK, duration);

    return apiResponse(
      {
        success: true,
        data: leaderboard,
        count: leaderboard.length
      },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/leaderboards/badges', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Get badge leaderboards failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Rozet liderlik tablosu alınırken bir hata oluştu',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
