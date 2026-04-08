/**
 * User Mentions API
 * Get mentions for a user
 */

import type { APIRoute } from 'astro';
import { queryMany, query } from '../../../../lib/postgres';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../lib/api';
import { recordRequest } from '../../../../lib/metrics';
import { getCache, setCache } from '../../../../lib/cache';
import { logger } from '../../../../lib/logging';

export const GET: APIRoute = async ({ request, params, url, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    // Auth required
    if (!locals.user?.id) {
      recordRequest('GET', `/api/users/${params.id}/mentions`, HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(
        ErrorCode.AUTH_REQUIRED,
        'Authentication required',
        HttpStatus.UNAUTHORIZED,
        undefined,
        requestId
      );
    }

    const userId = params.id as string;

    // Authorization check: user can only read their own mentions (or admins)
    if (userId !== locals.user.id && locals.user.role !== 'admin') {
      recordRequest('GET', `/api/users/${userId}/mentions`, HttpStatus.FORBIDDEN, Date.now() - startTime);
      return apiError(
        ErrorCode.FORBIDDEN,
        'You can only view your own mentions',
        HttpStatus.FORBIDDEN,
        undefined,
        requestId
      );
    }

    // Parse query params
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 50);
    const unreadOnly = url.searchParams.get('unread_only') === 'true';

    // Check cache
    const cacheKey = `sanliurfa:mentions:${userId}:${unreadOnly}`;
    const cached = await getCache(cacheKey);
    if (cached) {
      const duration = Date.now() - startTime;
      recordRequest('GET', `/api/users/${userId}/mentions`, HttpStatus.OK, duration);
      return apiResponse(JSON.parse(cached), HttpStatus.OK, requestId);
    }

    // Build query
    let whereClause = `WHERE um.mentioned_user_id = $1`;
    const params_arr: any[] = [userId];

    if (unreadOnly) {
      whereClause += ` AND um.is_read = false`;
    }

    // Fetch mentions
    const mentions = await queryMany(
      `SELECT um.id, um.mentioned_by_user_id, um.content_type, um.content_id,
              um.context_text, um.is_read, um.created_at,
              u.full_name as by_user_name, u.username as by_username, u.avatar_url as by_avatar
       FROM user_mentions um
       INNER JOIN users u ON um.mentioned_by_user_id = u.id
       ${whereClause}
       ORDER BY um.is_read ASC, um.created_at DESC
       LIMIT $${params_arr.length + 1}`,
      [...params_arr, limit]
    );

    // Count unread mentions
    const unreadCountResult = await queryMany(
      `SELECT COUNT(*) as count FROM user_mentions WHERE mentioned_user_id = $1 AND is_read = false`,
      [userId]
    );
    const unreadCount = parseInt(unreadCountResult[0]?.count || '0');

    // Fire-and-forget: mark returned mentions as read (only if owner is requesting)
    if (userId === locals.user.id) {
      query(
        `UPDATE user_mentions SET is_read = true WHERE mentioned_user_id = $1 AND is_read = false`,
        [userId]
      ).catch(err => {
        logger.error('Failed to mark mentions as read', err instanceof Error ? err : new Error(String(err)));
      });
    }

    const response = {
      success: true,
      data: mentions,
      count: mentions.length,
      unread_count: unreadCount
    };

    // Cache result (2 min TTL)
    await setCache(cacheKey, JSON.stringify(response), 120);

    const duration = Date.now() - startTime;
    recordRequest('GET', `/api/users/${userId}/mentions`, HttpStatus.OK, duration);

    return apiResponse(response, HttpStatus.OK, requestId);
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', `/api/users/${params.id}/mentions`, HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error(
      'Failed to get user mentions',
      error instanceof Error ? error : new Error(String(error))
    );
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to get mentions',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
