/**
 * Photo Management API
 * DELETE: Delete a photo
 */

import type { APIRoute } from 'astro';
import { deletePhoto, getPhotoById } from '../../../../lib/photos';
import { queryOne } from '../../../../lib/postgres';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../lib/api';
import { recordRequest } from '../../../../lib/metrics';
import { logger } from '../../../../lib/logging';

export const DELETE: APIRoute = async ({ request, locals, params }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    const user = locals.user;
    const { id: photoId } = params;

    // Check authentication
    if (!user) {
      recordRequest('DELETE', `/api/photos/${photoId}`, HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(
        ErrorCode.AUTH_REQUIRED,
        'Oturum açmanız gerekiyor',
        HttpStatus.UNAUTHORIZED,
        undefined,
        requestId
      );
    }

    // Verify photo exists
    const photo = await getPhotoById(photoId);
    if (!photo) {
      recordRequest('DELETE', `/api/photos/${photoId}`, HttpStatus.NOT_FOUND, Date.now() - startTime);
      return apiError(
        ErrorCode.NOT_FOUND,
        'Fotoğraf bulunamadı',
        HttpStatus.NOT_FOUND,
        undefined,
        requestId
      );
    }

    // Check authorization (photo owner or admin)
    const isAdmin = user.role === 'admin';
    const isOwner = photo.uploaded_by === user.id;

    if (!isAdmin && !isOwner) {
      recordRequest('DELETE', `/api/photos/${photoId}`, HttpStatus.FORBIDDEN, Date.now() - startTime);
      return apiError(
        ErrorCode.FORBIDDEN,
        'Bu fotoğrafı silme izniniz yok',
        HttpStatus.FORBIDDEN,
        undefined,
        requestId
      );
    }

    // Delete photo
    const success = await deletePhoto(photoId);

    if (!success) {
      recordRequest('DELETE', `/api/photos/${photoId}`, HttpStatus.INTERNAL_SERVER_ERROR, Date.now() - startTime);
      return apiError(
        ErrorCode.INTERNAL_ERROR,
        'Fotoğraf silinirken bir hata oluştu',
        HttpStatus.INTERNAL_SERVER_ERROR,
        undefined,
        requestId
      );
    }

    const duration = Date.now() - startTime;
    recordRequest('DELETE', `/api/photos/${photoId}`, HttpStatus.OK, duration);
    logger.logMutation('delete', 'place_photos', photoId, user.id, { placeId: photo.place_id });

    return apiResponse(
      {
        success: true,
        message: 'Fotoğraf silindi'
      },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('DELETE', `/api/photos/${params.id}`, HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Delete photo failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Fotoğraf silinirken bir hata oluştu',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
