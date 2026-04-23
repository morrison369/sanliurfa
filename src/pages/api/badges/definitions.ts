/**
 * Badge Definitions
 * GET /api/badges/definitions - Get all available badge types
 */

import type { APIRoute } from 'astro';
import { getBadgeDefinitions } from '../../../lib/place-verification';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { logger } from '../../../lib/logging';
import { recordRequest } from '../../../lib/metrics';
import { getCache, setCache } from '../../../lib/cache';

export const GET: APIRoute = async ({ request }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    // Check cache
    const cacheKey = 'badge:definitions';
    const cached = await getCache<any[]>(cacheKey);
    if (cached) {
      recordRequest('GET', '/api/badges/definitions', HttpStatus.OK, Date.now() - startTime);
      return apiResponse({
        success: true,
        definitions: cached
      }, HttpStatus.OK, requestId);
    }

    // Get badge definitions
    const definitions = await getBadgeDefinitions();
    await setCache(cacheKey, definitions, 3600);

    recordRequest('GET', '/api/badges/definitions', HttpStatus.OK, Date.now() - startTime);

    return apiResponse({
      success: true,
      definitions
    }, HttpStatus.OK, requestId);
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/badges/definitions', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Failed to get badge definitions', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Rozet tanımları alınamadı',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
