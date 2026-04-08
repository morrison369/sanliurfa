/**
 * Saved Searches API
 * GET: Get saved searches
 * POST: Save a search
 * DELETE: Remove saved search
 */

import type { APIRoute } from 'astro';
import { getSavedSearches, saveSearch, deleteSavedSearch, toggleSavedSearchFavorite } from '../../../lib/search-history';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { recordRequest } from '../../../lib/metrics';
import { logger } from '../../../lib/logging';

export const GET: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.id) {
      recordRequest('GET', '/api/search/saved', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(ErrorCode.AUTH_REQUIRED, 'Authentication required', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const url = new URL(request.url);
    const favoriteOnly = url.searchParams.get('favorites') === 'true';

    const searches = await getSavedSearches(locals.user.id, favoriteOnly);

    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/search/saved', HttpStatus.OK, duration);

    return apiResponse(
      {
        success: true,
        data: {
          searches,
          count: searches.length
        }
      },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/search/saved', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Get saved searches failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Kaydedilen aramalar alınamadı',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};

export const POST: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.id) {
      recordRequest('POST', '/api/search/saved', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(ErrorCode.AUTH_REQUIRED, 'Authentication required', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const body = await request.json();
    const { searchName, searchQuery, searchType, filters, action, savedSearchId } = body;

    if (action === 'toggle-favorite') {
      if (!savedSearchId) {
        recordRequest('POST', '/api/search/saved', HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
        return apiError(
          ErrorCode.VALIDATION_ERROR,
          'savedSearchId gereklidir',
          HttpStatus.UNPROCESSABLE_ENTITY,
          undefined,
          requestId
        );
      }
      await toggleSavedSearchFavorite(savedSearchId, locals.user.id);
    } else {
      if (!searchName || !searchQuery || !searchType) {
        recordRequest('POST', '/api/search/saved', HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
        return apiError(
          ErrorCode.VALIDATION_ERROR,
          'searchName, searchQuery, searchType gereklidir',
          HttpStatus.UNPROCESSABLE_ENTITY,
          undefined,
          requestId
        );
      }

      const id = await saveSearch(locals.user.id, searchName, searchQuery, searchType, filters);

      const duration = Date.now() - startTime;
      recordRequest('POST', '/api/search/saved', HttpStatus.CREATED, duration);

      return apiResponse(
        {
          success: true,
          data: { id, message: 'Arama kaydedildi' }
        },
        HttpStatus.CREATED,
        requestId
      );
    }

    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/search/saved', HttpStatus.OK, duration);

    return apiResponse(
      {
        success: true,
        message: 'İşlem başarılı'
      },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/search/saved', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Save search failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Arama kaydedilemedi',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};

export const DELETE: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.id) {
      recordRequest('DELETE', '/api/search/saved', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(ErrorCode.AUTH_REQUIRED, 'Authentication required', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const body = await request.json();
    const { savedSearchId } = body;

    if (!savedSearchId) {
      recordRequest('DELETE', '/api/search/saved', HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'savedSearchId gereklidir',
        HttpStatus.UNPROCESSABLE_ENTITY,
        undefined,
        requestId
      );
    }

    await deleteSavedSearch(savedSearchId, locals.user.id);

    const duration = Date.now() - startTime;
    recordRequest('DELETE', '/api/search/saved', HttpStatus.OK, duration);

    return apiResponse(
      {
        success: true,
        message: 'Kaydedilen arama silindi'
      },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('DELETE', '/api/search/saved', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Delete saved search failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Silme işlemi başarısız oldu',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
