/**
 * Featured Listing Detail API
 * GET: Get featured listing details
 * PUT: Update featured listing
 * DELETE: Delete featured listing
 */

import type { APIRoute } from 'astro';
import {
  getFeaturedListing,
  updateFeaturedListing,
  deleteFeaturedListing,
  recordFeaturedListingClick
} from '../../../lib/featured-listings';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { recordRequest } from '../../../lib/metrics';
import { logger } from '../../../lib/logging';

export const GET: APIRoute = async ({ request, locals, params }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    const { id } = params;
    if (!id) {
      recordRequest('GET', '/api/featured-listings/[id]', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(ErrorCode.VALIDATION_ERROR, 'ID required', HttpStatus.BAD_REQUEST, undefined, requestId);
    }

    // Record click if source parameter provided
    const url = new URL(request.url);
    const source = url.searchParams.get('source');
    if (source) {
      const deviceType = url.searchParams.get('device') || 'unknown';
      await recordFeaturedListingClick(id, locals.user?.id || null, source, deviceType);
    }

    const listing = await getFeaturedListing(id);
    if (!listing) {
      recordRequest('GET', '/api/featured-listings/[id]', HttpStatus.NOT_FOUND, Date.now() - startTime);
      return apiError(ErrorCode.NOT_FOUND, 'Featured listing not found', HttpStatus.NOT_FOUND, undefined, requestId);
    }

    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/featured-listings/[id]', HttpStatus.OK, duration);

    return apiResponse(
      { success: true, data: listing },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/featured-listings/[id]', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Get featured listing failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to get featured listing',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};

export const PUT: APIRoute = async ({ request, locals, params }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.id) {
      recordRequest('PUT', '/api/featured-listings/[id]', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(ErrorCode.AUTH_REQUIRED, 'Authentication required', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const { id } = params;
    if (!id) {
      recordRequest('PUT', '/api/featured-listings/[id]', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(ErrorCode.VALIDATION_ERROR, 'ID required', HttpStatus.BAD_REQUEST, undefined, requestId);
    }

    const body = await request.json();

    const updated = await updateFeaturedListing(id, locals.user.id, body);

    const duration = Date.now() - startTime;
    recordRequest('PUT', '/api/featured-listings/[id]', HttpStatus.OK, duration);

    return apiResponse(
      { success: true, data: updated },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    const statusCode = (error instanceof Error && error.message === 'Access denied') ? HttpStatus.FORBIDDEN : HttpStatus.INTERNAL_SERVER_ERROR;
    recordRequest('PUT', '/api/featured-listings/[id]', statusCode, duration);
    logger.error('Update featured listing failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to update featured listing',
      statusCode,
      undefined,
      requestId
    );
  }
};

export const DELETE: APIRoute = async ({ request, locals, params }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.id) {
      recordRequest('DELETE', '/api/featured-listings/[id]', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(ErrorCode.AUTH_REQUIRED, 'Authentication required', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const { id } = params;
    if (!id) {
      recordRequest('DELETE', '/api/featured-listings/[id]', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(ErrorCode.VALIDATION_ERROR, 'ID required', HttpStatus.BAD_REQUEST, undefined, requestId);
    }

    const deleted = await deleteFeaturedListing(id, locals.user.id);

    if (!deleted) {
      recordRequest('DELETE', '/api/featured-listings/[id]', HttpStatus.NOT_FOUND, Date.now() - startTime);
      return apiError(ErrorCode.NOT_FOUND, 'Featured listing not found', HttpStatus.NOT_FOUND, undefined, requestId);
    }

    const duration = Date.now() - startTime;
    recordRequest('DELETE', '/api/featured-listings/[id]', HttpStatus.OK, duration);

    return apiResponse(
      { success: true, message: 'Featured listing deleted' },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    const statusCode = (error instanceof Error && error.message === 'Access denied') ? HttpStatus.FORBIDDEN : HttpStatus.INTERNAL_SERVER_ERROR;
    recordRequest('DELETE', '/api/featured-listings/[id]', statusCode, duration);
    logger.error('Delete featured listing failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to delete featured listing',
      statusCode,
      undefined,
      requestId
    );
  }
};
