/**
 * User Search API
 * Search for users by name, username, or email (email only for self/admins)
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
    // Get query parameters
    const query = (url.searchParams.get('q') || '').trim();
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const sortBy = url.searchParams.get('sortBy') || 'relevance'; // relevance, points, level, recent

    // Validate query
    if (!query || query.length < 2) {
      recordRequest('GET', '/api/users/search', HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Arama terimi en az 2 karakter olmalıdır',
        HttpStatus.UNPROCESSABLE_ENTITY,
        undefined,
        requestId
      );
    }

    if (query.length > 100) {
      recordRequest('GET', '/api/users/search', HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Arama terimi çok uzun',
        HttpStatus.UNPROCESSABLE_ENTITY,
        undefined,
        requestId
      );
    }

    // Check cache
    const cacheKey = `sanliurfa:users:search:${query.toLowerCase()}:${sortBy}`;
    const cached = await getCache<any[]>(cacheKey);
    if (cached) {
      const duration = Date.now() - startTime;
      recordRequest('GET', '/api/users/search', HttpStatus.OK, duration);
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

    // Build search query - search by full_name, username, or email (email only if admin/self)
    const searchTerm = `%${query}%`;
    let sql = `
      SELECT
        id,
        full_name,
        username,
        avatar_url,
        bio,
        points,
        level,
        created_at,
        (
          CASE
            WHEN full_name ILIKE $1 THEN 3
            WHEN username ILIKE $1 THEN 2
            ELSE 1
          END
        ) as relevance_score
      FROM users
      WHERE (
        full_name ILIKE $1
        OR username ILIKE $1
        ${locals.user?.isAdmin || locals.user?.id ? 'OR email ILIKE $1' : ''}
      )
      AND role != 'admin'
    `;

    const params: any[] = [searchTerm];

    // Add ordering
    switch (sortBy) {
      case 'points':
        sql += ' ORDER BY points DESC, relevance_score DESC';
        break;
      case 'level':
        sql += ' ORDER BY level DESC, points DESC, relevance_score DESC';
        break;
      case 'recent':
        sql += ' ORDER BY created_at DESC, relevance_score DESC';
        break;
      case 'relevance':
      default:
        sql += ' ORDER BY relevance_score DESC, points DESC';
        break;
    }

    sql += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit + offset); // Get extra for pagination
    params.push(0);

    const result = await queryRows(sql, params);

    // Format response (exclude sensitive fields)
    const users = result.map((row: any) => ({
      id: row.id,
      full_name: row.full_name,
      username: row.username,
      avatar_url: row.avatar_url,
      bio: row.bio,
      points: row.points,
      level: row.level,
      created_at: row.created_at
    }));

    // Cache for 5 minutes
    await setCache(cacheKey, users, 300);

    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/users/search', HttpStatus.OK, duration);

    return apiResponse(
      {
        success: true,
        data: users.slice(offset, offset + limit),
        count: users.length,
        limit,
        offset
      },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/users/search', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('User search failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Kullanıcı arama sırasında bir hata oluştu',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
