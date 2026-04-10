/**
 * Personalized Activity Feed API
 * GET: Retrieve activity from followed users (social feed)
 */

import type { APIRoute } from 'astro';
import { queryRows } from '../../../lib/postgres';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { recordRequest } from '../../../lib/metrics';
import { logger } from '../../../lib/logging';
import { getCache, setCache } from '../../../lib/cache';

export const GET: APIRoute = async ({ request, url, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    const user = locals.user;

    if (!user) {
      recordRequest('GET', '/api/feed/activity', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(
        ErrorCode.AUTH_REQUIRED,
        'Oturum açmanız gerekiyor',
        HttpStatus.UNAUTHORIZED,
        undefined,
        requestId
      );
    }

    // Get query parameters
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const filter = url.searchParams.get('filter') || 'all'; // all, reviews, favorites, comments, badges
    const sortBy = url.searchParams.get('sortBy') || 'recent'; // recent, popular

    // Check cache
    const cacheKey = `sanliurfa:feed:${user.id}:${filter}:${sortBy}`;
    const cached = await getCache<any[]>(cacheKey);

    if (cached) {
      const duration = Date.now() - startTime;
      recordRequest('GET', '/api/feed/activity', HttpStatus.OK, duration);
      return apiResponse(
        {
          success: true,
          data: cached.slice(offset, offset + limit),
          count: cached.length,
          limit,
          offset
        },
        HttpStatus.OK,
        requestId,
        { 'X-Cache': 'HIT' }
      );
    }

    // Build query - get activity from followed users
    let sql = `
      SELECT
        ua.id,
        ua.user_id,
        ua.action_type,
        ua.reference_type,
        ua.reference_id,
        ua.metadata,
        ua.created_at,
        u.full_name,
        u.username,
        u.avatar_url,
        u.level
      FROM user_activity ua
      INNER JOIN users u ON ua.user_id = u.id
      INNER JOIN followers f ON ua.user_id = f.following_id
      WHERE f.follower_id = $1
        AND ua.created_at > NOW() - INTERVAL '30 days'
    `;

    const params: any[] = [user.id];

    // Apply filter
    if (filter !== 'all') {
      sql += ` AND ua.action_type = $${params.length + 1}`;
      params.push(filter === 'reviews' ? 'review_created' :
                 filter === 'favorites' ? 'favorite_added' :
                 filter === 'comments' ? 'comment_posted' :
                 filter === 'badges' ? 'badge_earned' : filter);
    }

    // Apply sorting
    if (sortBy === 'popular') {
      sql += ` ORDER BY ua.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(limit + offset);
      params.push(0);
    } else {
      sql += ` ORDER BY ua.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(limit + offset);
      params.push(0);
    }

    const result = await queryRows(sql, params);

    // Format response
    const activities = result.map((row: any) => ({
      id: row.id,
      user_id: row.user_id,
      user_name: row.full_name,
      user_username: row.username,
      user_avatar: row.avatar_url,
      user_level: row.level,
      action_type: row.action_type,
      reference_type: row.reference_type,
      reference_id: row.reference_id,
      metadata: row.metadata ? (typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata) : null,
      created_at: row.created_at
    }));

    // Cache for 3 minutes
    await setCache(cacheKey, activities, 180);

    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/feed/activity', HttpStatus.OK, duration);

    return apiResponse(
      {
        success: true,
        data: activities.slice(offset, offset + limit),
        count: activities.length,
        limit,
        offset,
        filter
      },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/feed/activity', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Get activity feed failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Aktivite akışı alınırken bir hata oluştu',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
