/**
 * Admin Blog Image Upload API
 * POST: Admin yorumlar/yazarlar için kapak görseli upload — 5MB cap, magic bytes,
 * MIME → ext mapping, randomBytes filename (HARD RULE #2, #3, #38 uyumlu).
 *
 * Returns: { success: true, data: { url: '/uploads/photos/blog/...' } }
 */

import type { APIRoute } from 'astro';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId, safeErrorDetail } from '../../../../lib/api';
import { recordRequest } from '../../../../lib/metrics';
import { logger } from '../../../../lib/logging';
import { saveFile, validateImageSignature, validateFileExtension } from '../../../../lib/file/file-storage';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB — blog kapağı için yeterli
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export const POST: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId(request);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    const user = locals.user;

    // HARD RULE #52 — yüksek-etki admin operasyonu, explicit `role !== 'admin'`
    if (!user || user.role !== 'admin') {
      recordRequest('POST', '/api/admin/blog/upload', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(ErrorCode.UNAUTHORIZED, 'Admin yetkisi gerekiyor', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      recordRequest('POST', '/api/admin/blog/upload', HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
      return apiError(ErrorCode.VALIDATION_ERROR, 'Dosya gereklidir', HttpStatus.UNPROCESSABLE_ENTITY, undefined, requestId);
    }

    if (file.size > MAX_FILE_SIZE) {
      recordRequest('POST', '/api/admin/blog/upload', HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
      return apiError(ErrorCode.VALIDATION_ERROR, `Dosya çok büyük (maksimum ${MAX_FILE_SIZE / 1024 / 1024}MB)`, HttpStatus.UNPROCESSABLE_ENTITY, undefined, requestId);
    }

    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      recordRequest('POST', '/api/admin/blog/upload', HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
      return apiError(ErrorCode.VALIDATION_ERROR, 'Desteklenmeyen format (JPEG, PNG, WebP)', HttpStatus.UNPROCESSABLE_ENTITY, undefined, requestId);
    }

    if (!validateFileExtension(file.name)) {
      recordRequest('POST', '/api/admin/blog/upload', HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
      return apiError(ErrorCode.VALIDATION_ERROR, 'Geçersiz dosya uzantısı', HttpStatus.UNPROCESSABLE_ENTITY, undefined, requestId);
    }

    // Magic bytes doğrulama — declared MIME ile gerçek dosya içeriği eşleşmeli (HARD RULE #2)
    const buffer = Buffer.from(await file.arrayBuffer());
    if (!validateImageSignature(buffer, file.type)) {
      recordRequest('POST', '/api/admin/blog/upload', HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
      return apiError(ErrorCode.VALIDATION_ERROR, 'Dosya içeriği geçersiz', HttpStatus.UNPROCESSABLE_ENTITY, undefined, requestId);
    }

    // Local disk — saveFile() randomBytes filename ile slugify uyguluyor (HARD RULE #38)
    const { filePath } = await saveFile(file, 'blog', undefined, buffer);

    logger.info('Blog cover image uploaded', { userId: user.id, size: file.size, mime: file.type });
    recordRequest('POST', '/api/admin/blog/upload', HttpStatus.CREATED, Date.now() - startTime);

    return apiResponse({ success: true, url: filePath }, HttpStatus.CREATED, requestId);
  } catch (error) {
    logger.error('Blog upload failed', error instanceof Error ? error : new Error(String(error)));
    recordRequest('POST', '/api/admin/blog/upload', HttpStatus.INTERNAL_SERVER_ERROR, Date.now() - startTime);
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      safeErrorDetail(error, 'Yükleme başarısız'),
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId,
    );
  }
};
