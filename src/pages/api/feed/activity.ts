/**
 * Personalized Activity Feed API
 * GET: Retrieve activity from followed users (social feed)
 */

import type { APIRoute } from 'astro';
import { queryMany } from '../../../lib/postgres';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId, safeIntParam } from '../../../lib/api';
import { recordRequest } from '../../../lib/metrics';
import { logger } from '../../../lib/logging';
import { getCache, setCache } from '../../../lib/cache';

interface FeedActivityRow {
  id: string;
  user_id: string;
  action_type: string;
  reference_type: string | null;
  reference_id: string | null;
  metadata: string | Record<string, unknown> | null;
  created_at: string | Date;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  level: string | number | null;
}

interface FeedActivityItem {
  id: string;
  user_id: string;
  user_name: string | null;
  user_username: string | null;
  user_avatar: string | null;
  user_level: string | number | null;
  action_type: string;
  reference_type: string | null;
  reference_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string | Date;
}

export const GET: APIRoute = async ({ request, url, locals }) => {
  const requestId = getRequestId(request);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    const user = locals.user;

    if (!user) {
      recordRequest('GET', '/api/feed/activity', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(
        ErrorCode.UNAUTHORIZED,
        'Oturum açmanız gerekiyor',
        HttpStatus.UNAUTHORIZED,
        undefined,
        requestId
      );
    }

    // Get query parameters
    const limit = safeIntParam(url.searchParams.get('limit'), 20, 1, 100);
    const offset = safeIntParam(url.searchParams.get('offset'), 0, 0, 1_000_000);
    const VALID_FILTERS = new Set(['all', 'reviews', 'favorites', 'comments', 'badges']);
    const rawFilter = url.searchParams.get('filter') || 'all';
    const filter = VALID_FILTERS.has(rawFilter) ? rawFilter : 'all';
    const VALID_SORT_BY = new Set(['recent', 'popular']);
    const rawSortBy = url.searchParams.get('sortBy') || 'recent';
    const sortBy = VALID_SORT_BY.has(rawSortBy) ? rawSortBy : 'recent';

    // Check cache
    const cacheKey = `feed:${user.id}:${filter}:${sortBy}`;
    const cached = await getCache<FeedActivityItem[]>(cacheKey);

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
        requestId
      );
    }

    // Build query - get activity from followed users
    // Tables: user_activities (canonical, logActivity yazıyor) + user_follows (53 row)
    let sql = `
      SELECT
        ua.id,
        ua.user_id,
        COALESCE(ua.type, ua.activity_type) AS action_type,
        COALESCE(ua.entity_type, ua.object_type) AS reference_type,
        COALESCE(ua.entity_id::text, ua.object_id::text) AS reference_id,
        ua.metadata,
        ua.created_at,
        u.full_name,
        u.username,
        u.avatar_url,
        COALESCE(u.level, 0) AS level
      FROM user_activities ua
      INNER JOIN users u ON ua.user_id = u.id
      INNER JOIN user_follows f ON ua.user_id = f.following_id
      WHERE f.follower_id = $1
        AND ua.created_at > NOW() - INTERVAL '30 days'
        AND COALESCE(ua.visibility, 'public') = 'public'
    `;

    const params: Array<string | number> = [user.id];

    // Apply filter
    const filterActionMap: Record<string, string> = {
      reviews: 'review_created',
      favorites: 'favorite_added',
      comments: 'comment_posted',
      badges: 'badge_earned',
    };
    if (filter !== 'all' && filterActionMap[filter]) {
      sql += ` AND COALESCE(ua.type, ua.activity_type) = $${params.length + 1}`;
      params.push(filterActionMap[filter]);
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

    const result = await queryMany<FeedActivityRow>(sql, params);

    // Format response
    const activities: FeedActivityItem[] = result.map((row) => ({
      id: row.id,
      user_id: row.user_id,
      user_name: row.full_name,
      user_username: row.username,
      user_avatar: row.avatar_url,
      user_level: row.level,
      action_type: row.action_type,
      reference_type: row.reference_type,
      reference_id: row.reference_id,
      metadata: row.metadata
        ? (typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata)
        : null,
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
