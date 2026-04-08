/**
 * Photo Upload API
 * POST: Upload a photo for a place
 */

import type { APIRoute } from 'astro';
import { uploadPhoto, getPhotoCount } from '../../../lib/photos';
import { queryOne } from '../../../lib/postgres';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { recordRequest } from '../../../lib/metrics';
import { logger } from '../../../lib/logging';
import { saveFile } from '../../../lib/file-storage';

// TODO: Configure storage settings
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const UPLOAD_DIR = process.env.PHOTO_UPLOAD_DIR || 'public/uploads/photos';

export const POST: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    const user = locals.user;

    // Check authentication
    if (!user) {
      recordRequest('POST', '/api/photos/upload', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(
        ErrorCode.AUTH_REQUIRED,
        'Oturum açmanız gerekiyor',
        HttpStatus.UNAUTHORIZED,
        undefined,
        requestId
      );
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const placeId = formData.get('placeId') as string | null;
    const altText = formData.get('altText') as string | null;
    const caption = formData.get('caption') as string | null;

    // Validate input
    if (!file || !placeId) {
      recordRequest('POST', '/api/photos/upload', HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Dosya ve mekan ID gereklidir',
        HttpStatus.UNPROCESSABLE_ENTITY,
        undefined,
        requestId
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      recordRequest('POST', '/api/photos/upload', HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        `Dosya çok büyük (maksimum ${MAX_FILE_SIZE / 1024 / 1024}MB)`,
        HttpStatus.UNPROCESSABLE_ENTITY,
        undefined,
        requestId
      );
    }

    // Validate MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      recordRequest('POST', '/api/photos/upload', HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Desteklenmeyen dosya türü (JPEG, PNG, WebP)',
        HttpStatus.UNPROCESSABLE_ENTITY,
        undefined,
        requestId
      );
    }

    // Verify place exists
    const place = await queryOne('SELECT id FROM places WHERE id = $1', [placeId]);
    if (!place) {
      recordRequest('POST', '/api/photos/upload', HttpStatus.NOT_FOUND, Date.now() - startTime);
      return apiError(
        ErrorCode.NOT_FOUND,
        'Mekan bulunamadı',
        HttpStatus.NOT_FOUND,
        undefined,
        requestId
      );
    }

    // Check photo limit per place (max 50)
    const photoCount = await getPhotoCount(placeId);
    if (photoCount >= 50) {
      recordRequest('POST', '/api/photos/upload', HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Bu mekan için maksimum fotoğraf sayısına ulaşılmıştır',
        HttpStatus.UNPROCESSABLE_ENTITY,
        undefined,
        requestId
      );
    }

    // Save file to storage
    let fileResult;
    try {
      fileResult = await saveFile(file, placeId);
    } catch (storageError) {
      recordRequest('POST', '/api/photos/upload', HttpStatus.INTERNAL_SERVER_ERROR, Date.now() - startTime);
      logger.error('File storage failed', storageError instanceof Error ? storageError : new Error(String(storageError)));
      return apiError(
        ErrorCode.INTERNAL_ERROR,
        'Dosya kaydedilirken bir hata oluştu',
        HttpStatus.INTERNAL_SERVER_ERROR,
        undefined,
        requestId
      );
    }

    // Save photo metadata
    const photo = await uploadPhoto(
      placeId,
      user.id,
      fileResult.filePath,
      file.size,
      file.type,
      altText || undefined,
      caption || undefined
    );

    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/photos/upload', HttpStatus.CREATED, duration);
    logger.logMutation('create', 'place_photos', photo.id, user.id, { placeId });

    return apiResponse(
      {
        success: true,
        data: photo
      },
      HttpStatus.CREATED,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/photos/upload', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Photo upload failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Fotoğraf yüklenirken bir hata oluştu',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
