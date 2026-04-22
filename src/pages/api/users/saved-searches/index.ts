/**
 * Manage user's saved searches
 * GET /api/users/saved-searches — List all saved searches
 * POST /api/users/saved-searches — Create new saved search
 */

import type { APIRoute } from 'astro';
import { getUserSavedSearches, saveSearch } from '../../../../lib/saved-searches';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../lib/api';
import { logger } from '../../../../lib/logging';
import { recordRequest } from '../../../../lib/metrics';

export const GET: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    // Auth required
    if (!locals.user) {
      recordRequest('GET', '/api/users/saved-searches', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(
        ErrorCode.UNAUTHORIZED,
        'Oturum açmanız gerekiyor',
        HttpStatus.UNAUTHORIZED,
        undefined,
        requestId
      );
    }

    const userId = locals.user.id;
    const searches = await getUserSavedSearches(userId);

    recordRequest('GET', '/api/users/saved-searches', HttpStatus.OK, Date.now() - startTime);

    return apiResponse({
      success: true,
      data: searches,
      count: searches.length
    }, HttpStatus.OK, requestId);
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/users/saved-searches', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Failed to get saved searches', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Kayıtlı aramalar alınamadı',
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
    // Auth required
    if (!locals.user) {
      recordRequest('POST', '/api/users/saved-searches', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(
        ErrorCode.UNAUTHORIZED,
        'Oturum açmanız gerekiyor',
        HttpStatus.UNAUTHORIZED,
        undefined,
        requestId
      );
    }

    const userId = locals.user.id;
    const body = await request.json();

    // Validate input
    if (!body.name || typeof body.name !== 'string') {
      recordRequest('POST', '/api/users/saved-searches', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Arama adı gereklidir',
        HttpStatus.BAD_REQUEST,
        undefined,
        requestId
      );
    }

    if (!body.query || typeof body.query !== 'string') {
      recordRequest('POST', '/api/users/saved-searches', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Arama sorgusu gereklidir',
        HttpStatus.BAD_REQUEST,
        undefined,
        requestId
      );
    }

    if (body.name.length > 100) {
      recordRequest('POST', '/api/users/saved-searches', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Arama adı en fazla 100 karakter olabilir',
        HttpStatus.BAD_REQUEST,
        undefined,
        requestId
      );
    }

    const searchId = await saveSearch(userId, body.name, body.query, body.filters || null);

    if (!searchId) {
      throw new Error('Arama kaydedilemedi');
    }

    recordRequest('POST', '/api/users/saved-searches', HttpStatus.CREATED, Date.now() - startTime);
    logger.info('Saved search created', { userId, searchId, searchName: body.name });

    return apiResponse({
      success: true,
      message: 'Arama kaydedildi',
      searchId
    }, HttpStatus.CREATED, requestId);
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/users/saved-searches', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Failed to save search', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Arama kaydedilemedi',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
