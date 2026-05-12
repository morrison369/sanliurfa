/**
 * Request Place Verification
 * POST /api/places/[id]/request-verification - Request verification for a place
 */

import type { APIRoute } from 'astro';
import { requestPlaceVerification } from '../../../../lib/place/place-verification';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../lib/api';
import { logger } from '../../../../lib/logging';
import { recordRequest } from '../../../../lib/metrics';
import { queryOne } from '../../../../lib/postgres';

export const POST: APIRoute = async ({ request, locals, params }) => {
  const requestId = getRequestId(request);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    // Auth required
    if (!locals.user) {
      recordRequest('POST', '/api/places/[id]/request-verification', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(
        ErrorCode.UNAUTHORIZED,
        'Authentication required',
        HttpStatus.UNAUTHORIZED,
        undefined,
        requestId
      );
    }

    const { id: placeId } = params;
    if (!placeId) {
      recordRequest('POST', '/api/places/[id]/request-verification', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(ErrorCode.VALIDATION_ERROR, 'Mekan kimliği gerekli', HttpStatus.BAD_REQUEST, undefined, requestId);
    }

    // Verify place exists and check ownership (IDOR guard)
    const place = await queryOne<{ id: string; owner_id: string | null }>(
      'SELECT id, owner_id FROM places WHERE id = $1',
      [placeId]
    );
    if (!place) {
      recordRequest('POST', '/api/places/[id]/request-verification', HttpStatus.NOT_FOUND, Date.now() - startTime);
      return apiError(
        ErrorCode.NOT_FOUND,
        'Place not found',
        HttpStatus.NOT_FOUND,
        undefined,
        requestId
      );
    }

    // Only the owner or admin can request verification
    if (locals.user.role !== 'admin' && place.owner_id !== locals.user.id) {
      recordRequest('POST', '/api/places/[id]/request-verification', HttpStatus.FORBIDDEN, Date.now() - startTime);
      return apiError(
        ErrorCode.FORBIDDEN,
        'Bu mekan için doğrulama talebinde bulunma yetkiniz yok',
        HttpStatus.FORBIDDEN,
        undefined,
        requestId
      );
    }

    // Get request body
    const body = await request.json();
    const documents = body.documents || [];
    if (!Array.isArray(documents) || documents.length > 20) {
      recordRequest('POST', '/api/places/[id]/request-verification', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(ErrorCode.VALIDATION_ERROR, 'documents dizisi en fazla 20 öğe içerebilir', HttpStatus.BAD_REQUEST, undefined, requestId);
    }

    // Request verification
    const verification = await requestPlaceVerification(placeId, documents);

    if (!verification) {
      recordRequest('POST', '/api/places/[id]/request-verification', HttpStatus.CONFLICT, Date.now() - startTime);
      return apiError(
        ErrorCode.CONFLICT,
        'This place already has a pending or verified verification request',
        HttpStatus.CONFLICT,
        undefined,
        requestId
      );
    }

    recordRequest('POST', '/api/places/[id]/request-verification', HttpStatus.CREATED, Date.now() - startTime);

    return apiResponse({
      success: true,
      verification
    }, HttpStatus.CREATED, requestId);
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/places/[id]/request-verification', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Failed to request verification', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to request verification',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
