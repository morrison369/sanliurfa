/**
 * Search Suggestions API
 * GET: Get autocomplete suggestions
 */

import type { APIRoute } from 'astro';
import {
  getSearchSuggestions,
  getGlobalSuggestions,
  getPersonalizedSuggestions,
  getFuzzySuggestions,
} from '../../../lib/search/search-suggestions';
import { getRecentSearches } from '../../../lib/search/search-history';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId, safeIntParam } from '../../../lib/api';
import { recordRequest } from '../../../lib/metrics';
import { logger } from '../../../lib/logging';

export const GET: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId(request);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    const url = new URL(request.url);
    const prefix = url.searchParams.get('prefix');
    const searchType = url.searchParams.get('type') || 'places';
    const limit = safeIntParam(url.searchParams.get('limit'), 10, 1, 50);

    if (!prefix || prefix.length < 1) {
      // Return recent or trending searches if no prefix
      const recent = await getRecentSearches(locals.user?.id, limit);
      const suggestions = await getPersonalizedSuggestions(locals.user?.id, Math.min(limit, 5));

      const duration = Date.now() - startTime;
      recordRequest('GET', '/api/search/suggestions', HttpStatus.OK, duration);

      return apiResponse(
        {
          success: true,
          data: {
            suggestions: [...suggestions.map((s) => s.suggestion_text), ...recent].slice(0, limit),
            type: locals.user ? 'personalized' : 'trending'
          }
        },
        HttpStatus.OK,
        requestId
      );
    }

    // Get suggestions for prefix
    const [localSuggestions, globalSuggestions] = await Promise.all([
      getSearchSuggestions(prefix, searchType, limit),
      getGlobalSuggestions(prefix, Math.min(limit, 5))
    ]);
    const fuzzySuggestions =
      localSuggestions.length === 0 && prefix.length >= 2
        ? await getFuzzySuggestions(prefix, searchType, Math.min(limit, 5))
        : [];

    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/search/suggestions', HttpStatus.OK, duration);

    return apiResponse(
      {
        success: true,
        data: {
          suggestions: localSuggestions.slice(0, limit),
          fuzzy: fuzzySuggestions,
          global: globalSuggestions.slice(0, Math.min(limit, 3)),
          type: 'autocomplete'
        }
      },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/search/suggestions', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Get suggestions failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Öneriler alınamadı',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
