/**
 * API: Advanced Search
 * GET - AI-powered search with ranking and personalization
 */
import type { APIRoute } from 'astro';
import { queryMany } from '../../../lib/postgres';
import { rankSearchResults, recordSearchQuery } from '../../../lib/search-intelligence';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { recordRequest } from '../../../lib/metrics';
import { logger } from '../../../lib/logging';
import { getCache, setCache } from '../../../lib/cache';

export const GET: APIRoute = async ({ request, url, locals }) => {
  const requestId = getRequestId(request as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    const query = url.searchParams.get('q');
    const category = url.searchParams.get('category');
    const minRating = parseFloat(url.searchParams.get('minRating') || '0');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);
    const offset = parseInt(url.searchParams.get('offset') || '0');

    if (!query || query.trim().length < 2) {
      recordRequest('GET', '/api/search/advanced', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(ErrorCode.VALIDATION_ERROR, 'Query must be at least 2 characters', HttpStatus.BAD_REQUEST, undefined, requestId);
    }

    // Try cache first
    const cacheKey = `sanliurfa:search:advanced:${query}:${category}:${minRating}:${limit}:${offset}`;
    const cached = await getCache(cacheKey);
    if (cached) {
      recordRequest('GET', '/api/search/advanced', HttpStatus.OK, Date.now() - startTime);
      const data = JSON.parse(cached);
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
        p.title,
        p.description,
        p.category,
        p.average_rating,
        p.review_count,
        p.latitude,
        p.longitude,
        p.image_url,
        p.updated_at,
        COUNT(DISTINCT f.id) as favorite_count
      FROM places p
      LEFT JOIN favorites f ON p.id = f.place_id
      WHERE p.is_active = true
      AND (p.title ILIKE $1 OR p.description ILIKE $1)
      AND p.average_rating >= $2
    `;

    const params: any[] = [`%${query}%`, minRating];

    if (category) {
      searchSql += ` AND p.category = $${params.length + 1}`;
      params.push(category);
    }

    searchSql += `
      GROUP BY p.id
      ORDER BY p.average_rating DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
    params.push(limit, offset);

    const results = await queryMany(searchSql, params);

    // Apply AI ranking
    const rankedResults = await rankSearchResults(results, locals.user?.id, query);

    // Record search
    await recordSearchQuery(locals.user?.id || null, query, results.length, { category, minRating });

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
    logger.error('Advanced search failed', err instanceof Error ? err : new Error(String(err)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Search failed', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
