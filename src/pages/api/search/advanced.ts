/**
 * API: Advanced Search
 * GET - AI-powered search with ranking and personalization
 */
import type { APIRoute } from 'astro';
import { queryMany } from '../../../lib/postgres';
import { rankSearchResults, recordSearchQuery } from '../../../lib/search/search-intelligence';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId, safeIntParam, safeFloatParam } from '../../../lib/api';
import { recordRequest } from '../../../lib/metrics';
import { logger } from '../../../lib/logging';
import { getCache, setCache } from '../../../lib/cache';
import { resolveContentImage } from '../../../lib/content-images';

export const GET: APIRoute = async ({ request, url }) => {
  const requestId = getRequestId(request);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    const query = url.searchParams.get('q');
    const category = url.searchParams.get('category');
    const minRating = safeFloatParam(url.searchParams.get('minRating'), 0, 0, 5);
    const limit = safeIntParam(url.searchParams.get('limit'), 20, 1, 100);
    const offset = safeIntParam(url.searchParams.get('offset'), 0, 0, 1_000_000);

    if (!query || query.trim().length < 2) {
      recordRequest('GET', '/api/search/advanced', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(ErrorCode.VALIDATION_ERROR, 'Query must be at least 2 characters', HttpStatus.BAD_REQUEST, undefined, requestId);
    }

    // Try cache first
    const cacheKey = `search:advanced:${query}:${category}:${minRating}:${limit}:${offset}`;
    const cached = await getCache(cacheKey);
    if (cached) {
      recordRequest('GET', '/api/search/advanced', HttpStatus.OK, Date.now() - startTime);
      const data = JSON.parse(cached as string);
      return apiResponse(
        { success: true, data, cached: true },
        HttpStatus.OK,
        requestId
      );
    }

    // Build search query
    let searchSql = `
      SELECT
        p.id,
        p.slug,
        p.name,
        COALESCE(p.short_description, p.description) as description,
        p.category,
        COALESCE(p.rating, 0) as average_rating,
        COALESCE(p.review_count, p.rating_count, 0) as review_count,
        COALESCE(p.thumbnail_url, p.images[1]) as image_url,
        p.updated_at,
        COUNT(DISTINCT f.id) as favorite_count
      FROM places p
      LEFT JOIN favorites f ON p.id = f.place_id
      WHERE p.status = 'active'
      AND (p.name ILIKE $1 OR COALESCE(p.short_description, p.description, '') ILIKE $1)
      AND COALESCE(p.rating, 0) >= $2
    `;

    const params: unknown[] = [`%${query}%`, minRating];

    if (category) {
      searchSql += ` AND p.category = $${params.length + 1}`;
      params.push(category);
    }

    searchSql += `
      GROUP BY p.id
      ORDER BY COALESCE(p.rating, 0) DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
    params.push(limit, offset);

    const results = await queryMany(searchSql, params);

    // Apply AI ranking
    const normalizedResults = results.map((row) => ({
      ...row,
      image_url: resolveContentImage({
        category: 'places',
        slug: row.slug,
        explicit: row.image_url,
        placeholder: '/images/placeholder-place.jpg',
      }),
    }));

    const rankedResults = rankSearchResults(normalizedResults);

    // Record search
    recordSearchQuery(query, results.length);

    // Cache results
    await setCache(cacheKey, JSON.stringify(rankedResults), 300);

    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/search/advanced', HttpStatus.OK, duration);

    return apiResponse(
      {
        success: true,
        data: rankedResults,
        meta: {
          query,
          totalResults: results.length,
          limit,
          offset
        }
      },
      HttpStatus.OK,
      requestId
    );
  } catch (err) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/search/advanced', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Advanced search failed', err instanceof Error ? err : new Error(String(err)), {});
    return apiError(ErrorCode.INTERNAL_ERROR, 'Search failed', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
