/**
 * Photo Vote API
 * POST: Vote on a photo (helpful/unhelpful)
 */

import type { APIRoute } from 'astro';
import { voteOnPhoto, getPhotoById } from '../../../../lib/photos';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../lib/api';
import { recordRequest } from '../../../../lib/metrics';
import { logger } from '../../../../lib/logging';

export const POST: APIRoute = async ({ request, locals, params }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    const user = locals.user;
    const { id: photoId } = params;

    // Check authentication
    if (!user) {
      recordRequest('POST', `/api/photos/${photoId}/vote`, HttpStatus.UNAUTHORIZED, Date.now() - startTime);
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
    const { voteType } = body;

    // Validate input
    if (!voteType || !['helpful', 'unhelpful'].includes(voteType)) {
      recordRequest('POST', `/api/photos/${photoId}/vote`, HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Oy türü "helpful" veya "unhelpful" olmalı',
        HttpStatus.UNPROCESSABLE_ENTITY,
        undefined,
        requestId
      );
    }

    // Verify photo exists
    const photo = await getPhotoById(photoId);
    if (!photo) {
      recordRequest('POST', `/api/photos/${photoId}/vote`, HttpStatus.NOT_FOUND, Date.now() - startTime);
      return apiError(
        ErrorCode.NOT_FOUND,
        'Fotoğraf bulunamadı',
        HttpStatus.NOT_FOUND,
        undefined,
        requestId
      );
    }

    // Vote on photo
    const success = await voteOnPhoto(photoId, user.id, voteType);

    if (!success) {
      recordRequest('POST', `/api/photos/${photoId}/vote`, HttpStatus.INTERNAL_SERVER_ERROR, Date.now() - startTime);
      return apiError(
        ErrorCode.INTERNAL_ERROR,
        'Oy kaydedilirken bir hata oluştu',
        HttpStatus.INTERNAL_SERVER_ERROR,
        undefined,
        requestId
      );
    }

    // Get updated photo
    const updatedPhoto = await getPhotoById(photoId);

    const duration = Date.now() - startTime;
    recordRequest('POST', `/api/photos/${photoId}/vote`, HttpStatus.OK, duration);
    logger.logMutation('create', 'photo_votes', `${photoId}-${user.id}`, user.id, { voteType });

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
    recordRequest('POST', `/api/photos/${params.id}/vote`, HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Vote on photo failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Oy kaydedilirken bir hata oluştu',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
