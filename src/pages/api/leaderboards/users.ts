/**
 * User Leaderboards API
 * GET: Retrieve top users by different metrics (points, level, activity, recent)
 */

import type { APIRoute } from 'astro';
import { queryRows } from '../../../lib/postgres';
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
    const sortBy = url.searchParams.get('sortBy') || 'points'; // points, level, activity, recent
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);

    // Validate sortBy
    if (!['points', 'level', 'activity', 'recent'].includes(sortBy)) {
      recordRequest('GET', '/api/leaderboards/users', HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Geçersiz sıralama türü',
        HttpStatus.UNPROCESSABLE_ENTITY,
        undefined,
        requestId
      );
    }

    // Check cache
    const cacheKey = `sanliurfa:leaderboard:users:${sortBy}:${limit}`;
    const cached = await getCache<any[]>(cacheKey);
    if (cached) {
      const duration = Date.now() - startTime;
      recordRequest('GET', '/api/leaderboards/users', HttpStatus.OK, duration);
      return apiResponse(
        {
          success: true,
          data: cached,
          count: cached.length,
          sortBy
        },
        HttpStatus.OK,
        requestId,
        { 'X-Cache': 'HIT' }
      );
    }

    let sql = `
      SELECT
        u.id,
        u.full_name,
        u.username,
        u.avatar_url,
        u.points,
        u.level,
        u.created_at,
        COUNT(DISTINCT ua.id) as activity_count,
        COUNT(DISTINCT CASE WHEN ua.action_type = 'badge_earned' THEN 1 END) as badge_count,
        COUNT(DISTINCT CASE WHEN ua.action_type = 'review_created' THEN 1 END) as review_count,
        COUNT(DISTINCT CASE WHEN ua.action_type = 'favorite_added' THEN 1 END) as favorite_count
      FROM users u
      LEFT JOIN user_activity ua ON u.id = ua.user_id AND ua.created_at > NOW() - INTERVAL '30 days'
      WHERE u.role = 'user'
    `;

    // Group by user
    sql += ` GROUP BY u.id`;

    // Add ordering
    switch (sortBy) {
      case 'points':
        sql += ` ORDER BY u.points DESC, u.level DESC, u.created_at ASC`;
        break;
      case 'level':
        sql += ` ORDER BY u.level DESC, u.points DESC, u.created_at ASC`;
        break;
      case 'activity':
        sql += ` ORDER BY activity_count DESC, u.points DESC, u.created_at ASC`;
        break;
      case 'recent':
        sql += ` ORDER BY u.created_at DESC`;
        break;
    }

    sql += ` LIMIT $1`;

    const result = await queryRows(sql, [limit]);

    // Format response with ranks
    const leaderboard = result.map((row: any, index: number) => ({
      rank: index + 1,
      id: row.id,
      full_name: row.full_name,
      username: row.username,
      avatar_url: row.avatar_url,
      points: row.points,
      level: row.level,
      created_at: row.created_at,
      activity_count: parseInt(row.activity_count || '0'),
      badge_count: parseInt(row.badge_count || '0'),
      review_count: parseInt(row.review_count || '0'),
      favorite_count: parseInt(row.favorite_count || '0')
    }));

    // Cache for 10 minutes
    await setCache(cacheKey, leaderboard, 600);

    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/leaderboards/users', HttpStatus.OK, duration);

    return apiResponse(
      {
        success: true,
        data: leaderboard,
        count: leaderboard.length,
        sortBy
      },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/leaderboards/users', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Get leaderboards failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Liderlik tablosu alınırken bir hata oluştu',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
