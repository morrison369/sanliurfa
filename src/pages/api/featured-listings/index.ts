/**
 * Featured Listings API
 * GET: List active featured listings
 * POST: Create new featured listing (requires auth)
 */

import type { APIRoute } from 'astro';
import {
  getActiveFeaturedListings,
  createFeaturedListing,
  getUserFeaturedListings
} from '../../../lib/featured-listings';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { recordRequest } from '../../../lib/metrics';
import { logger } from '../../../lib/logging';

export const GET: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '10'), 100);
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const myListings = url.searchParams.get('my') === 'true';

    let data;

    if (myListings) {
      if (!locals.user?.id) {
        recordRequest('GET', '/api/featured-listings', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
        return apiError(ErrorCode.AUTH_REQUIRED, 'Authentication required', HttpStatus.UNAUTHORIZED, undefined, requestId);
      }
      data = await getUserFeaturedListings(locals.user.id);
    } else {
      const result = await getActiveFeaturedListings(limit, offset);
      data = result;
    }

    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/featured-listings', HttpStatus.OK, duration);

    return apiResponse(
      { success: true, data },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/featured-listings', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Get featured listings failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to get featured listings',
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
      recordRequest('POST', '/api/featured-listings', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(ErrorCode.AUTH_REQUIRED, 'Authentication required', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const body = await request.json();
    const {
      place_id,
      title,
      description,
      featured_image_url,
      position_tier,
      start_date,
      end_date,
      cost_per_day,
      settings
    } = body;

    // Validation
    if (!place_id || !title || !position_tier || !start_date || !end_date) {
      recordRequest('POST', '/api/featured-listings', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Missing required fields',
        HttpStatus.BAD_REQUEST,
        undefined,
        requestId
      );
    }

    const featuredListing = await createFeaturedListing(place_id, locals.user.id, {
      title,
      description,
      featured_image_url,
      position_tier,
      start_date,
      end_date,
      cost_per_day: cost_per_day || 0,
      settings
    });

    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/featured-listings', HttpStatus.CREATED, duration);

    logger.info('Featured listing created via API', { id: featuredListing.id, userId: locals.user.id });

    return apiResponse(
      { success: true, data: featuredListing },
      HttpStatus.CREATED,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/featured-listings', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Create featured listing failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to create featured listing',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
