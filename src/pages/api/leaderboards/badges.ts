/**
 * Badge Leaderboards API
 * GET: Retrieve users by badge achievements and earned badges
 */

import type { APIRoute } from 'astro';
import { queryMany } from '../../../lib/postgres';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId, safeIntParam } from '../../../lib/api';
import { recordRequest } from '../../../lib/metrics';
import { logger } from '../../../lib/logging';
import { getCache, setCache } from '../../../lib/cache';

interface BadgeLeaderboardRow {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  points: string | number | null;
  level: string | number | null;
  badge_count: string | number | null;
  total_badges_earned: string | number | null;
  badges: Array<string | null> | null;
  last_badge_earned: string | Date | null;
}

interface BadgeLeaderboardItem {
  rank: number;
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  points: string | number | null;
  level: string | number | null;
  badge_count: number;
  total_badges_earned: number;
  badges: string[];
  last_badge_earned: string | Date | null;
}


export const GET: APIRoute = async ({ request, url }) => {
  const requestId = getRequestId(request);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    // Get query parameters
    const limit = safeIntParam(url.searchParams.get('limit'), 50, 1, 100);

    // Check cache
    const cacheKey = `leaderboard:badges:${limit}`;
    const cached = await getCache<BadgeLeaderboardItem[]>(cacheKey);
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
        requestId
      );
    }

    // Get users with badge achievements (subquery for badge stats — avoids complex GROUP BY)
    const sql = `
      WITH badge_stats AS (
        SELECT
          ua.user_id,
          COUNT(DISTINCT ua.metadata->>'badgeName') AS badge_count,
          COUNT(DISTINCT ua.id) AS total_badges_earned,
          ARRAY_AGG(DISTINCT ua.metadata->>'badgeName') AS badges,
          MAX(ua.created_at) AS last_badge_earned
        FROM user_activities ua
        WHERE COALESCE(ua.type, ua.activity_type) = 'badge_earned'
          AND ua.metadata->>'badgeName' IS NOT NULL
        GROUP BY ua.user_id
      )
      SELECT
        u.id,
        u.full_name,
        u.username,
        u.avatar_url,
        u.points,
        u.level,
        bs.badge_count,
        bs.total_badges_earned,
        bs.badges,
        bs.last_badge_earned
      FROM users u
      INNER JOIN badge_stats bs ON bs.user_id = u.id
      WHERE u.role = 'user'
      ORDER BY bs.badge_count DESC, bs.total_badges_earned DESC, u.points DESC
      LIMIT $1
    `;

    const result = await queryMany<BadgeLeaderboardRow>(sql, [limit]);

    // Format response with ranks
    const leaderboard: BadgeLeaderboardItem[] = result.map((row, index) => ({
      rank: index + 1,
      id: row.id,
      full_name: row.full_name,
      username: row.username,
      avatar_url: row.avatar_url,
      points: row.points,
      level: row.level,
      badge_count: Number(row.badge_count) || 0,
      total_badges_earned: Number(row.total_badges_earned) || 0,
      badges: row.badges ? row.badges.filter((badge): badge is string => Boolean(badge)) : [],
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
