/**
 * Hashtag Content API
 * Get hashtag metadata and tagged places/reviews
 */

import type { APIRoute } from 'astro';
import { queryOne, queryRows } from '../../../lib/postgres';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { recordRequest } from '../../../lib/metrics';
import { getCache, setCache } from '../../../lib/cache';
import { logger } from '../../../lib/logging';

export const GET: APIRoute = async ({ request, params, url }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    const slug = params.slug as string;
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 50);

    // Check cache
    const cacheKey = `sanliurfa:hashtag:slug:${slug}`;
    const cached = await getCache(cacheKey);
    if (cached) {
      const duration = Date.now() - startTime;
      recordRequest('GET', `/api/hashtags/${slug}`, HttpStatus.OK, duration);
      return apiResponse(JSON.parse(cached), HttpStatus.OK, requestId);
    }

    // Fetch hashtag metadata
    const hashtag = await queryOne(
      `SELECT id, tag_name, tag_slug, usage_count, is_trending, trending_rank, created_at
       FROM hashtags WHERE tag_slug = $1`,
      [slug]
    );

    if (!hashtag) {
      recordRequest('GET', `/api/hashtags/${slug}`, HttpStatus.NOT_FOUND, Date.now() - startTime);
      return apiError(
        ErrorCode.NOT_FOUND,
        'Hashtag not found',
        HttpStatus.NOT_FOUND,
        undefined,
        requestId
      );
    }

    // Fetch tagged places
    const places = await queryRows(
      `SELECT DISTINCT p.id, p.name, p.slug, p.category, p.rating_avg, p.address,
              hu.used_at as tagged_at
       FROM places p
       INNER JOIN hashtag_usage hu ON p.id = hu.content_id
       WHERE hu.hashtag_id = $1 AND hu.content_type = 'place'
       ORDER BY hu.used_at DESC
       LIMIT $2`,
      [hashtag.id, limit]
    );

    // Fetch tagged reviews
    const reviews = await queryRows(
      `SELECT DISTINCT r.id, r.content, r.rating, r.created_at,
              u.full_name as user_name, u.username,
              p.name as place_name, p.slug as place_slug,
              hu.used_at as tagged_at
       FROM reviews r
       INNER JOIN hashtag_usage hu ON r.id = hu.content_id
       INNER JOIN users u ON r.user_id = u.id
       INNER JOIN places p ON r.place_id = p.id
       WHERE hu.hashtag_id = $1 AND hu.content_type = 'review'
       ORDER BY r.created_at DESC
       LIMIT $2`,
      [hashtag.id, limit]
    );

    const response = {
      success: true,
      hashtag: {
        id: hashtag.id,
        tag_name: hashtag.tag_name,
        tag_slug: hashtag.tag_slug,
        usage_count: hashtag.usage_count,
        is_trending: hashtag.is_trending,
        trending_rank: hashtag.trending_rank,
        created_at: hashtag.created_at
      },
      places,
      reviews,
      places_count: places.length,
      reviews_count: reviews.length
    };

    // Cache result (10 min TTL)
    await setCache(cacheKey, JSON.stringify(response), 600);

    const duration = Date.now() - startTime;
    recordRequest('GET', `/api/hashtags/${slug}`, HttpStatus.OK, duration);

    return apiResponse(response, HttpStatus.OK, requestId);
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', `/api/hashtags/${params.slug}`, HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error(
      'Failed to get hashtag content',
      error instanceof Error ? error : new Error(String(error))
    );
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to get hashtag content',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
