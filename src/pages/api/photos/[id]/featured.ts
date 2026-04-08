/**
 * Featured Photo API
 * PUT: Set a photo as featured
 */

import type { APIRoute } from 'astro';
import { setFeaturedPhoto, getPhotoById } from '../../../../lib/photos';
import { queryOne } from '../../../../lib/postgres';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../lib/api';
import { recordRequest } from '../../../../lib/metrics';
import { logger } from '../../../../lib/logging';

export const PUT: APIRoute = async ({ request, locals, params }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    const user = locals.user;
    const { id: photoId } = params;

    // Check authentication
    if (!user) {
      recordRequest('PUT', `/api/photos/${photoId}/featured`, HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(
        ErrorCode.AUTH_REQUIRED,
        'Oturum açmanız gerekiyor',
        HttpStatus.UNAUTHORIZED,
        undefined,
        requestId
      );
    }

    // Parse request body
    const body = await request.json();
    const { isFeatured } = body;

    if (typeof isFeatured !== 'boolean') {
      recordRequest('PUT', `/api/photos/${photoId}/featured`, HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'isFeatured boolean olmalı',
        HttpStatus.UNPROCESSABLE_ENTITY,
        undefined,
        requestId
      );
    }

    // Verify photo exists
    const photo = await getPhotoById(photoId);
    if (!photo) {
      recordRequest('PUT', `/api/photos/${photoId}/featured`, HttpStatus.NOT_FOUND, Date.now() - startTime);
      return apiError(
        ErrorCode.NOT_FOUND,
        'Fotoğraf bulunamadı',
        HttpStatus.NOT_FOUND,
        undefined,
        requestId
      );
    }

    // Check authorization - only admin or place owner can set featured
    const place = await queryOne('SELECT user_id FROM places WHERE id = $1', [photo.place_id]);
    const isAdmin = user.role === 'admin';
    const isPlaceOwner = place?.user_id === user.id;
    const isPhotoOwner = photo.uploaded_by === user.id;

    if (!isAdmin && !isPlaceOwner && !isPhotoOwner) {
      recordRequest('PUT', `/api/photos/${photoId}/featured`, HttpStatus.FORBIDDEN, Date.now() - startTime);
      return apiError(
        ErrorCode.FORBIDDEN,
        'Bu fotoğrafı öne çıkarma izniniz yok',
        HttpStatus.FORBIDDEN,
        undefined,
        requestId
      );
    }

    // Set featured status
    const success = await setFeaturedPhoto(photoId, photo.place_id, isFeatured);

    if (!success) {
      recordRequest('PUT', `/api/photos/${photoId}/featured`, HttpStatus.INTERNAL_SERVER_ERROR, Date.now() - startTime);
      return apiError(
        ErrorCode.INTERNAL_ERROR,
        'Öne çıkarma durumu güncellenirken bir hata oluştu',
        HttpStatus.INTERNAL_SERVER_ERROR,
        undefined,
        requestId
      );
    }

    // Get updated photo
    const updatedPhoto = await getPhotoById(photoId);

    const duration = Date.now() - startTime;
    recordRequest('PUT', `/api/photos/${photoId}/featured`, HttpStatus.OK, duration);
    logger.logMutation('update', 'place_photos', photoId, user.id, { isFeatured });

    return apiResponse(
      {
        success: true,
        data: updatedPhoto
      },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('PUT', `/api/photos/${params.id}/featured`, HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Set featured photo failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Öne çıkarma durumu güncellenirken bir hata oluştu',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
