/**
 * Record Place Visit
 * POST /api/places/[id]/visit - Record a visit to a place
 */

import type { APIRoute } from 'astro';
import { recordPlaceVisit } from '../../../../lib/place-visits';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../lib/api';
import { logger } from '../../../../lib/logging';
import { recordRequest } from '../../../../lib/metrics';
import { queryOne } from '../../../../lib/postgres';

export const POST: APIRoute = async ({ request, locals, params }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    // Auth required
    if (!locals.user) {
      recordRequest('POST', '/api/places/[id]/visit', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(
        ErrorCode.UNAUTHORIZED,
        'Authentication required',
        HttpStatus.UNAUTHORIZED,
        undefined,
        requestId
      );
    }

    const { id: placeId } = params;
    const userId = locals.user.id;
    const body = await request.json();

    // Verify place exists
    const place = await queryOne('SELECT id FROM places WHERE id = $1', [placeId]);
    if (!place) {
      recordRequest('POST', '/api/places/[id]/visit', HttpStatus.NOT_FOUND, Date.now() - startTime);
      return apiError(
        ErrorCode.NOT_FOUND,
        'Place not found',
        HttpStatus.NOT_FOUND,
        undefined,
        requestId
      );
    }

    // Validate rating if provided
    if (body.rating && (body.rating < 0 || body.rating > 5)) {
      recordRequest('POST', '/api/places/[id]/visit', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Rating must be between 0 and 5',
        HttpStatus.BAD_REQUEST,
        undefined,
        requestId
      );
    }

    // Record visit
    const visit = await recordPlaceVisit(
      userId,
      placeId,
      body.visitedAt ? new Date(body.visitedAt) : new Date(),
      body.notes,
      body.rating,
      body.durationMinutes
    );

    if (!visit) {
      throw new Error('Failed to record visit');
    }

    recordRequest('POST', '/api/places/[id]/visit', HttpStatus.CREATED, Date.now() - startTime);

    return apiResponse({
      success: true,
      message: 'Ziyaret kaydedildi',
      visit
    }, HttpStatus.CREATED, requestId);
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/places/[id]/visit', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Failed to record visit', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to record visit',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
