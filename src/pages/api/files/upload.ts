/**
 * File Upload Endpoint
 * Generate S3 upload signatures and register files
 */

import type { APIRoute } from 'astro';
import { registerS3File, generateUploadSignature } from '../../../lib/file-management';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { logger } from '../../../lib/logging';

export const POST: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  logger.setRequestId(requestId);

  try {
    if (!locals.user) {
      return apiError(ErrorCode.UNAUTHORIZED, 'Authentication required', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const body = await request.json();
    const { filename, file_type, file_size } = body;

    if (!filename || !file_type || !file_size) {
      return apiError(ErrorCode.VALIDATION_ERROR, 'Filename, file type, and size required', HttpStatus.UNPROCESSABLE_ENTITY, undefined, requestId);
    }

    if (file_size > 5 * 1024 * 1024 * 1024) { // 5GB limit
      return apiError(ErrorCode.VALIDATION_ERROR, 'File size exceeds limit', HttpStatus.UNPROCESSABLE_ENTITY, undefined, requestId);
    }

    const fileKey = `${locals.user.id}/${Date.now()}-${filename}`;

    const file = await registerS3File(
      locals.user.id,
      fileKey,
      filename,
      file_size,
      file_type,
      `https://sanliurfa.s3.amazonaws.com/${fileKey}`,
      false
    );

    if (!file) {
      return apiError(ErrorCode.INTERNAL_ERROR, 'Failed to register file', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
    }

    const uploadSignature = generateUploadSignature('sanliurfa', fileKey);

    logger.info('Upload signature generated', { fileId: file.id, filename });

    return apiResponse({
      success: true,
      data: {
        file_id: file.id,
        file_key: fileKey,
        ...uploadSignature
      }
    }, HttpStatus.OK, requestId);
  } catch (error) {
    logger.error('Failed to generate upload signature', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Upload failed', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
