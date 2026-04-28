/**
 * Search API
 * GET: Perform search across places, reviews, events
 */

import type { APIRoute } from 'astro';
import { searchPlaces, searchReviews, searchEvents, recordSearchQuery } from '../../../lib/search/search-engine';
import { recordSuggestionImpression, updateAutocompleteIndex, recordZeroResultSearch } from '../../../lib/search/search-suggestions';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId, safeIntParam, safeFloatParam } from '../../../lib/api';
import { recordRequest } from '../../../lib/metrics';
import { logger } from '../../../lib/logging';

export const GET: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId(request);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    const url = new URL(request.url);
    const query = url.searchParams.get('q');
    const searchType = url.searchParams.get('type') || 'places';
    const rawSortBy = url.searchParams.get('sort') || 'rating';
    const VALID_SORT_OPTIONS = new Set(['rating', 'newest', 'name', 'distance']);
    const sortBy = VALID_SORT_OPTIONS.has(rawSortBy) ? rawSortBy : 'rating';
    const limit = safeIntParam(url.searchParams.get('limit'), 20, 1, 100);
    const offset = safeIntParam(url.searchParams.get('offset'), 0, 0, 1_000_000);

    if (!query || query.trim().length < 2) {
      recordRequest('GET', '/api/search', HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'En az 2 karakterli bir arama terimi gereklidir',
        HttpStatus.UNPROCESSABLE_ENTITY,
        undefined,
        requestId
      );
    }

    if (query.length > 500) {
      recordRequest('GET', '/api/search', HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
      return apiError(ErrorCode.VALIDATION_ERROR, 'Arama terimi 500 karakterden uzun olamaz', HttpStatus.UNPROCESSABLE_ENTITY, undefined, requestId);
    }

    // Parse filters
    const filters: Record<string, unknown> = {};
    const rawCategory = url.searchParams.get('category');
    if (rawCategory) filters.category = rawCategory.substring(0, 100);
    const rawCity = url.searchParams.get('city');
    if (rawCity) filters.city = rawCity.substring(0, 100);
    if (url.searchParams.get('minRating')) {
      filters.minRating = safeFloatParam(url.searchParams.get('minRating'), 0, 0, 5);
    }
    if (url.searchParams.get('placeId')) filters.placeId = url.searchParams.get('placeId');

    let results: Record<string, unknown>[] = [];
    let resultCount = 0;

    if (searchType === 'reviews') {
      results = await searchReviews(query, filters, limit, offset);
      resultCount = results.length;
    } else if (searchType === 'events') {
      results = await searchEvents(query, filters, limit, offset);
      resultCount = results.length;
    } else {
      results = await searchPlaces(query, filters, sortBy, limit, offset);
      resultCount = results.length;
    }

    // Record search
    recordSearchQuery(locals.user?.id, query, searchType, resultCount, filters).catch(err => {
      logger.error('Failed to record search', err);
    });

    // Update autocomplete index
    updateAutocompleteIndex(query, searchType).catch(err => {
      logger.error('Failed to update autocomplete', err);
    });

    // Record zero results
    if (resultCount === 0) {
      recordZeroResultSearch(query, searchType, filters).catch(err => {
        logger.error('Failed to record zero results', err);
      });
    }

    // Record suggestion impression
    recordSuggestionImpression(query, searchType).catch(err => {
      logger.error('Failed to record impression', err);
    });

    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/search', HttpStatus.OK, duration);

    return apiResponse(
      {
        success: true,
        data: {
          results,
          query,
          searchType,
          resultCount,
          limit,
          offset,
          hasMore: resultCount === limit
        }
      },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/search', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Search failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Arama başarısız oldu',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
