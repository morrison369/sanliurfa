/**
 * File Upload Endpoint
 * Local filesystem upload (no S3 - project uses local storage only)
 */

import type { APIRoute } from 'astro';
import { saveFile } from '../../../lib/file/file-storage';
import { query } from '../../../lib/postgres';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { logger } from '../../../lib/logger';

export const POST: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);

  try {
    if (!locals.user) {
      return apiError(ErrorCode.UNAUTHORIZED, 'Authentication required', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return apiError(ErrorCode.VALIDATION_ERROR, 'multipart/form-data gerekli', HttpStatus.UNPROCESSABLE_ENTITY, undefined, requestId);
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const folder = (formData.get('folder') as string) || 'general';

    if (!file) {
      return apiError(ErrorCode.VALIDATION_ERROR, 'Dosya zorunludur', HttpStatus.UNPROCESSABLE_ENTITY, undefined, requestId);
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return apiError(ErrorCode.VALIDATION_ERROR, 'Dosya boyutu 10MB sınırını aşıyor', HttpStatus.UNPROCESSABLE_ENTITY, undefined, requestId);
    }

    const allowedFolders = ['places', 'avatars', 'blog', 'events', 'general'];
    const safeFolder = allowedFolders.includes(folder) ? folder : 'general';

    const saved = await saveFile(file, safeFolder);

    // Register in file registry table — s3_files is legacy name, used for local files too
    try {
      await query(
        `INSERT INTO s3_files (file_key, original_filename, file_size_bytes, mime_type, file_type, s3_bucket, s3_url, cdn_url, uploaded_by_user_id, is_public)
         VALUES ($1, $2, $3, $4, $5, 'local', $6, $6, $7, true)`,
        [saved.filePath, file.name, file.size, file.type, safeFolder, saved.publicUrl, locals.user.id]
      );
    } catch {
      // Non-fatal: file is already saved to disk
    }

    logger.info('File uploaded', { userId: locals.user.id, folder: safeFolder, size: file.size });

    return apiResponse({
      file_url: saved.publicUrl,
      file_path: saved.filePath,
      file_name: file.name,
      file_size: file.size,
      mime_type: file.type,
    }, HttpStatus.OK, requestId);
  } catch (error) {
    logger.error('File upload failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Dosya yüklenemedi', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
