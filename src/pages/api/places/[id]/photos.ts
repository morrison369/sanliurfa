/**
 * Place Photos API
 * GET: Retrieve photos for a place
 */

import type { APIRoute } from 'astro';
import { getPlacePhotos } from '../../../../lib/photos';
import { queryOne } from '../../../../lib/postgres';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../lib/api';
import { recordRequest } from '../../../../lib/metrics';
import { logger } from '../../../../lib/logging';

export const GET: APIRoute = async ({ request, params }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    const { id: placeId } = params;
    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);

    // Verify place exists
    const place = await queryOne('SELECT id FROM places WHERE id = $1', [placeId]);
    if (!place) {
      recordRequest('GET', `/api/places/${placeId}/photos`, HttpStatus.NOT_FOUND, Date.now() - startTime);
      return apiError(
        ErrorCode.NOT_FOUND,
        'Mekan bulunamadı',
        HttpStatus.NOT_FOUND,
        undefined,
        requestId
      );
    }

    // Get photos
    const photos = await getPlacePhotos(placeId, limit);

    const duration = Date.now() - startTime;
    recordRequest('GET', `/api/places/${placeId}/photos`, HttpStatus.OK, duration);

    return apiResponse(
      {
        success: true,
        data: photos,
        count: photos.length
      },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', `/api/places/${params.id}/photos`, HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Get place photos failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Fotoğraflar alınırken bir hata oluştu',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
