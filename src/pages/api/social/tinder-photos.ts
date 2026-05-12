import type { APIRoute } from 'astro';
import { requireAuth } from '../../../lib/auth';
import { query, queryOne } from '../../../lib/postgres';
import { saveFile, validateImageSignature, deleteFile } from '../../../lib/file/file-storage';
import { apiResponse, apiError, problemJson, HttpStatus, safeErrorDetail, safeIntParam, ErrorCode } from '../../../lib/api';
import { logger } from '../../../lib/logging';

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};
const MAX_TINDER_PHOTOS = 4;
const MAX_PHOTO_SIZE = 8 * 1024 * 1024; // 8MB

export const POST: APIRoute = async ({ request }) => {
  try {
    const auth = await requireAuth(request);
    if (!auth.user) {
      return problemJson({ status: 401, title: 'Unauthorized', detail: 'Giriş gerekli', type: '/problems/auth-required', instance: '/api/social/tinder-photos' });
    }

    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return problemJson({ status: 400, title: 'Geçersiz İçerik', detail: 'multipart/form-data bekleniyor', type: '/problems/tinder-photo-content-type', instance: '/api/social/tinder-photos' });
    }

    // Check current photo count
    const profile = await queryOne<{ photos: string[] }>(
      'SELECT photos FROM user_match_profiles WHERE user_id = $1',
      [auth.user.id]
    );
    const currentPhotos: string[] = Array.isArray((profile as any)?.photos) ? (profile as any).photos : [];

    if (currentPhotos.length >= MAX_TINDER_PHOTOS) {
      return apiError(ErrorCode.VALIDATION_ERROR, `En fazla ${MAX_TINDER_PHOTOS} eşleşme fotoğrafı ekleyebilirsiniz. Önce bir tanesini silin.`, 400);
    }

    const formData = await request.formData();
    const file = formData.get('photo') as File | null;
    if (!file || !(file instanceof File)) {
      return apiError(ErrorCode.VALIDATION_ERROR, 'photo alanı zorunludur', 400);
    }
    if (file.size > MAX_PHOTO_SIZE) {
      return apiError(ErrorCode.VALIDATION_ERROR, 'Fotoğraf boyutu 8MB\'ı aşamaz', 400);
    }

    const mimeType = file.type.toLowerCase();
    const ext = MIME_TO_EXT[mimeType];
    if (!ext) {
      return apiError(ErrorCode.VALIDATION_ERROR, 'Sadece JPEG, PNG ve WebP desteklenir', 400);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (!validateImageSignature(buffer, mimeType)) {
      return apiError(ErrorCode.VALIDATION_ERROR, 'Geçersiz görsel dosyası', 400);
    }

    const saved = await saveFile(
      new File([buffer], `photo.${ext}`, { type: mimeType }),
      `tinder/${auth.user.id}`,
      undefined,
      buffer
    );

    const newPhotos = [...currentPhotos, saved.filePath].slice(0, MAX_TINDER_PHOTOS);

    await query(
      `INSERT INTO user_match_profiles (user_id, photos, is_discoverable, updated_at)
       VALUES ($1, $2::text[], true, NOW())
       ON CONFLICT (user_id)
       DO UPDATE SET photos = $2::text[], updated_at = NOW()`,
      [auth.user.id, newPhotos]
    );

    logger.info('Tinder photo uploaded', { userId: auth.user.id, filePath: saved.filePath });
    return apiResponse({ filePath: saved.filePath, photos: newPhotos }, HttpStatus.CREATED);
  } catch (error) {
    return problemJson({ status: 500, title: 'Yükleme Başarısız', detail: safeErrorDetail(error, 'Tinder fotoğrafı yüklenemedi'), type: '/problems/tinder-photo-upload-failed', instance: '/api/social/tinder-photos' });
  }
};

export const DELETE: APIRoute = async ({ request, url }) => {
  try {
    const auth = await requireAuth(request);
    if (!auth.user) {
      return problemJson({ status: 401, title: 'Unauthorized', detail: 'Giriş gerekli', type: '/problems/auth-required', instance: '/api/social/tinder-photos' });
    }

    const index = safeIntParam(url.searchParams.get('index'), -1, 0, 3);
    if (index < 0) return apiError(ErrorCode.VALIDATION_ERROR, 'index parametresi (0-3) zorunludur', 400);

    const profile = await queryOne<{ photos: string[] }>(
      'SELECT photos FROM user_match_profiles WHERE user_id = $1',
      [auth.user.id]
    );
    const currentPhotos: string[] = Array.isArray((profile as any)?.photos) ? (profile as any).photos : [];

    if (index >= currentPhotos.length) {
      return apiError(ErrorCode.NOT_FOUND, 'Bu indekste fotoğraf yok', 404);
    }

    const removedPath = currentPhotos[index];
    const newPhotos = currentPhotos.filter((_, i) => i !== index);

    await query(
      'UPDATE user_match_profiles SET photos = $2::text[], updated_at = NOW() WHERE user_id = $1',
      [auth.user.id, newPhotos]
    );

    // Delete local file if it's in our tinder folder
    if (removedPath && removedPath.includes('/uploads/photos/tinder/')) {
      await deleteFile(removedPath).catch(() => null);
    }

    logger.info('Tinder photo deleted', { userId: auth.user.id, index, removedPath });
    return apiResponse({ photos: newPhotos }, HttpStatus.OK);
  } catch (error) {
    return problemJson({ status: 500, title: 'Silinemedi', detail: safeErrorDetail(error, 'Tinder fotoğrafı silinemedi'), type: '/problems/tinder-photo-delete-failed', instance: '/api/social/tinder-photos' });
  }
};
