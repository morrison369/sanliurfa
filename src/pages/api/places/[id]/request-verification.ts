// @ts-nocheck
/**
 * Request Place Verification
 * POST /api/places/[id]/request-verification - Request verification for a place
 */

import type { APIRoute } from 'astro';
import { requestPlaceVerification } from '../../../../lib/place-verification';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../lib/api';
import { logger } from '../../../../lib/logging';
import { recordRequest } from '../../../../lib/metrics';
import { queryOne } from '../../../../lib/postgres';

export const POST: APIRoute = async ({ request, locals, params }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    // Oturum zorunlu
    if (!locals.user) {
      recordRequest('POST', '/api/places/[id]/request-verification', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(
        ErrorCode.UNAUTHORIZED,
        'Oturum açmanız gerekiyor',
        HttpStatus.UNAUTHORIZED,
        undefined,
        requestId
      );
    }

    const { id: placeId } = params;

    // Verify place exists
    const place = await queryOne('SELECT id FROM places WHERE id = $1', [placeId]);
    if (!place) {
      recordRequest('POST', '/api/places/[id]/request-verification', HttpStatus.NOT_FOUND, Date.now() - startTime);
      return apiError(
        ErrorCode.NOT_FOUND,
        'Mekan bulunamadı',
        HttpStatus.NOT_FOUND,
        undefined,
        requestId
      );
    }

    // Get request body
    const body = await request.json();
    const documents = body.documents || [];

    // Request verification
    const verification = await requestPlaceVerification(placeId, documents);

    if (!verification) {
      recordRequest('POST', '/api/places/[id]/request-verification', HttpStatus.CONFLICT, Date.now() - startTime);
      return apiError(
        ErrorCode.CONFLICT,
        'Bu mekanın bekleyen veya onaylanmış doğrulama talebi zaten var',
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
      'Doğrulama talebi gönderilemedi',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
