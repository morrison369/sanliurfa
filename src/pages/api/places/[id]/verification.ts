/**
 * Place Verification Status
 * GET /api/places/[id]/verification - Get place verification status
 */

import type { APIRoute } from 'astro';
import { getPlaceVerification } from '../../../../lib/place-verification';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../lib/api';
import { logger } from '../../../../lib/logging';
import { recordRequest } from '../../../../lib/metrics';
import { queryOne } from '../../../../lib/postgres';

export const GET: APIRoute = async ({ request, params }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    const { id: placeId } = params;

    // Verify place exists
    const place = await queryOne('SELECT id FROM places WHERE id = $1', [placeId]);
    if (!place) {
      recordRequest('GET', '/api/places/[id]/verification', HttpStatus.NOT_FOUND, Date.now() - startTime);
      return apiError(
        ErrorCode.NOT_FOUND,
        'Place not found',
        HttpStatus.NOT_FOUND,
        undefined,
        requestId
      );
    }

    // Get verification status
    const verification = await getPlaceVerification(placeId);

    recordRequest('GET', '/api/places/[id]/verification', HttpStatus.OK, Date.now() - startTime);

    return apiResponse({
      success: true,
      verification
    }, HttpStatus.OK, requestId);
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/places/[id]/verification', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Failed to get verification status', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to get verification status',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
