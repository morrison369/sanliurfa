/**
 * Search API
 * GET: Perform search across places, reviews, events
 */

import type { APIRoute } from 'astro';
import { searchPlaces, searchReviews, searchEvents, recordSearchQuery, getTrendingSearches } from '../../../lib/search-engine';
import { recordSuggestionImpression, updateAutocompleteIndex, recordZeroResultSearch } from '../../../lib/search-suggestions';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { recordRequest } from '../../../lib/metrics';
import { logger } from '../../../lib/logging';

export const GET: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    const url = new URL(request.url);
    const query = url.searchParams.get('q');
    const searchType = url.searchParams.get('type') || 'places';
    const sortBy = url.searchParams.get('sort') || 'relevance';
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);
    const offset = parseInt(url.searchParams.get('offset') || '0');

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

    // Parse filters
    const filters: any = {};
    if (url.searchParams.get('category')) filters.category = url.searchParams.get('category');
    if (url.searchParams.get('city')) filters.city = url.searchParams.get('city');
    if (url.searchParams.get('minRating')) filters.minRating = parseFloat(url.searchParams.get('minRating')!);
    if (url.searchParams.get('placeId')) filters.placeId = url.searchParams.get('placeId');

    let results: any[] = [];
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
