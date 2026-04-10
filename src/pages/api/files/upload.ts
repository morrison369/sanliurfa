/**
 * File Upload Endpoint
 * Store file via current runtime storage provider and register metadata
 */

import type { APIRoute } from 'astro';
import { registerS3File, buildManagedFileUrls } from '../../../lib/file-management';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { saveFile } from '../../../lib/file-storage';
import { logger } from '../../../lib/logging';

export const POST: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  logger.setRequestId(requestId);

  try {
    if (!locals.user) {
      return apiError(ErrorCode.UNAUTHORIZED, 'Authentication required', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const formData = await request.formData();
    const uploadFile = formData.get('file');
    const isPublic = formData.get('is_public')?.toString() === 'true';

    if (!(uploadFile instanceof File) || uploadFile.size === 0) {
      return apiError(ErrorCode.VALIDATION_ERROR, 'File is required', HttpStatus.UNPROCESSABLE_ENTITY, undefined, requestId);
    }

    if (uploadFile.size > 5 * 1024 * 1024 * 1024) { // 5GB limit
      return apiError(ErrorCode.VALIDATION_ERROR, 'File size exceeds limit', HttpStatus.UNPROCESSABLE_ENTITY, undefined, requestId);
    }

    const fileKey = `${locals.user.id}/${Date.now()}-${uploadFile.name}`;
    const storedFile = await saveFile(uploadFile, `managed-files/${locals.user.id}`, uploadFile.name);

    const registeredFile = await registerS3File(
      locals.user.id,
      fileKey,
      uploadFile.name,
      uploadFile.size,
      uploadFile.type,
      storedFile.publicUrl,
      isPublic
    );

    if (!registeredFile) {
      return apiError(ErrorCode.INTERNAL_ERROR, 'Failed to register file', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
    }

    logger.info('Managed file uploaded', { fileId: registeredFile.id, filename: uploadFile.name, storagePath: storedFile.filePath });

    return apiResponse({
      success: true,
      data: {
        ...registeredFile,
        ...buildManagedFileUrls(storedFile.publicUrl, process.env.STORAGE_TYPE === 'supabase' ? 'supabase' : 'local')
      }
    }, HttpStatus.OK, requestId);
  } catch (error) {
    logger.error('Failed to upload managed file', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Upload failed', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
