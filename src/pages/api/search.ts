/**
 * Advanced Search with Filters
 * GET /api/search?q=kebab&category=restaurants&rating=4&sort=rating
 */

import type { APIRoute } from 'astro';
import { queryMany } from '../../lib/postgres';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../lib/api';
import { logger } from '../../lib/logging';
import { recordRequest } from '../../lib/metrics';
import { getCache, setCache } from '../../lib/cache';

export const GET: APIRoute = async ({ request, url, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    const q = url.searchParams.get('q') || '';
    const type = url.searchParams.get('type') || 'all';
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);
    const category = url.searchParams.get('category');
    const minRating = url.searchParams.get('rating') ? parseInt(url.searchParams.get('rating') || '0') : 0;
    const sort = url.searchParams.get('sort') || 'relevance';

    // Validate query
    if (!q || q.length < 2) {
      recordRequest('GET', '/api/search', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Arama terimi en az 2 karakter olmalı',
        HttpStatus.BAD_REQUEST,
        undefined,
        requestId
      );
    }

    // Check cache
    const cacheKey = `sanliurfa:search:${q}:${type}:${category}:${minRating}:${sort}:${limit}`;
    const cached = await getCache(cacheKey);
    if (cached) {
      recordRequest('GET', '/api/search', HttpStatus.OK, Date.now() - startTime);
      return apiResponse(JSON.parse(cached), HttpStatus.OK, requestId);
    }

    const searchTerm = '%' + q + '%';
    let results = { places: [], users: [], collections: [] };

    // Search places
    if (type === 'all' || type === 'places') {
      let placesQuery = `SELECT id, name, category, rating, image_url FROM places WHERE status = 'active' AND (name ILIKE $1 OR description ILIKE $1)`;
      const params: any[] = [searchTerm];
      let paramCount = 2;

      if (category) {
        placesQuery += ` AND category = $${paramCount}`;
        params.push(category);
        paramCount++;
      }

      if (minRating > 0) {
        placesQuery += ` AND rating >= $${paramCount}`;
        params.push(minRating);
        paramCount++;
      }

      // Sorting
      const sortMap: Record<string, string> = {
        'rating': 'rating DESC',
        'newest': 'created_at DESC',
        'popular': 'favorite_count DESC',
        'relevance': 'rating DESC'
      };
      placesQuery += ` ORDER BY ${sortMap[sort] || sortMap['relevance']}`;
      placesQuery += ` LIMIT $${paramCount}`;
      params.push(limit);

      const places = await queryMany(placesQuery, params);
      results.places = places;
    }

    // Search users
    if (type === 'all' || type === 'users') {
      const users = await queryMany(
        `SELECT id, full_name, username, avatar_url FROM users WHERE full_name ILIKE $1 OR username ILIKE $1 LIMIT $2`,
        [searchTerm, Math.floor(limit / 2)]
      );
      results.users = users;
    }

    // Search collections
    if (type === 'all' || type === 'collections') {
      const collections = await queryMany(
        `SELECT id, name, description FROM place_collections WHERE public = true AND (name ILIKE $1 OR description ILIKE $1) LIMIT $2`,
        [searchTerm, Math.floor(limit / 2)]
      );
      results.collections = collections;
    }

    const responseData = {
      success: true,
      query: q,
      filters: { category, minRating, sort },
      data: results,
      total: results.places.length + results.users.length + results.collections.length
    };

    // Cache for 5 minutes
    await setCache(cacheKey, JSON.stringify(responseData), 300);

    // Record search activity if authenticated
    if (locals.user) {
      await queryMany(
        `INSERT INTO user_searches (user_id, query, filters, results_count)
         VALUES ($1, $2, $3, $4)`,
        [
          locals.user.id,
          q,
          JSON.stringify({ category, minRating, sort }),
          responseData.total
        ]
      ).catch(err => logger.error('Failed to record search', err));
    }

    recordRequest('GET', '/api/search', HttpStatus.OK, Date.now() - startTime);

    return apiResponse(responseData, HttpStatus.OK, requestId);
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/search', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Search failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Arama başarısız',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
