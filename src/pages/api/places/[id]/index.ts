/**
 * Place Detail API
 * GET /api/places/[id] - Get place by id
 */

import type { APIRoute } from 'astro';
import { queryOne } from '../../../../lib/postgres';
import { resolveContentImage } from '../../../../lib/content-images';
import { apiError, apiResponse, ErrorCode, getRequestId, HttpStatus } from '../../../../lib/api';
import { logger } from '../../../../lib/logging';
import { recordRequest } from '../../../../lib/metrics';

export const GET: APIRoute = async ({ request, params }) => {
  const requestId = getRequestId(request);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    const { id } = params;

    if (!id) {
      recordRequest('GET', '/api/places/[id]', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Mekan ID gereklidir',
        HttpStatus.BAD_REQUEST,
        undefined,
        requestId
      );
    }

    const place = await queryOne(
      `SELECT id, slug, name, category, description, address, phone, email, website, latitude, longitude,
              rating, review_count, avg_rating, status, is_featured, thumbnail_url, created_at, updated_at
       FROM places
       WHERE id = $1 AND status = 'active'
       LIMIT 1`,
      [id]
    );

    if (!place) {
      recordRequest('GET', '/api/places/[id]', HttpStatus.NOT_FOUND, Date.now() - startTime);
      return apiError(
        ErrorCode.NOT_FOUND,
        'Mekan bulunamadı',
        HttpStatus.NOT_FOUND,
        undefined,
        requestId
      );
    }

    const normalizedPlace = {
      ...place,
      image_url: resolveContentImage({
        category: 'places',
        slug: place.slug,
        explicit: place.thumbnail_url,
        placeholder: '/images/placeholder-place.jpg',
      }),
      thumbnail_url: resolveContentImage({
        category: 'places',
        slug: place.slug,
        explicit: place.thumbnail_url,
        placeholder: '/images/placeholder-place.jpg',
        thumb: true,
      }),
    };

    recordRequest('GET', '/api/places/[id]', HttpStatus.OK, Date.now() - startTime);
    return apiResponse({ success: true, data: normalizedPlace }, HttpStatus.OK, requestId);
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/places/[id]', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Get place detail failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Mekan detayı alınırken bir hata oluştu',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
