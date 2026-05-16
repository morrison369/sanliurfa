import type { APIRoute } from 'astro';
import { requireAuth } from '../../../../lib/auth';
import { queryOne, queryMany } from '../../../../lib/postgres';
import { saveFile, validateImageSignature } from '../../../../lib/file/file-storage';
import { apiResponse, apiError, problemJson, HttpStatus, safeErrorDetail, safeIntParam, ErrorCode } from '../../../../lib/api';
import { logger } from '../../../../lib/logging';

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

const MAX_PHOTO_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_PHOTOS_PER_USER = 50;

export const GET: APIRoute = async ({ request, url }) => {
  try {
    const auth = await requireAuth(request);
    const page = safeIntParam(url.searchParams.get('page'), 1, 1, 1000);
    const limit = safeIntParam(url.searchParams.get('limit'), 24, 1, 48);
    const offset = (page - 1) * limit;
    const userId = url.searchParams.get('user');
    const own = url.searchParams.get('own') === '1';

    let rows: any[];

    if (own && auth.user) {
      // Own photos (any status)
      rows = await queryMany(
        `SELECT cp.*, u.full_name, u.username, u.avatar_url,
                COALESCE(
                  (SELECT 1 FROM community_photo_likes l WHERE l.photo_id = cp.id AND l.user_id = $3),
                  0
                )::boolean AS liked_by_me
         FROM community_photos cp
         JOIN users u ON u.id = cp.user_id
         WHERE cp.user_id = $3
         ORDER BY cp.created_at DESC
         LIMIT $1 OFFSET $2`,
        [limit, offset, auth.user.id]
      );
    } else if (userId) {
      // Another user's approved photos
      rows = await queryMany(
        `SELECT cp.*, u.full_name, u.username, u.avatar_url,
                COALESCE(
                  (SELECT 1 FROM community_photo_likes l WHERE l.photo_id = cp.id AND l.user_id = $4),
                  0
                )::boolean AS liked_by_me
         FROM community_photos cp
         JOIN users u ON u.id = cp.user_id
         WHERE cp.user_id = $3 AND cp.status = 'approved'
         ORDER BY cp.created_at DESC
         LIMIT $1 OFFSET $2`,
        [limit, offset, userId, auth.user?.id || '00000000-0000-0000-0000-000000000000']
      );
    } else {
      // Public gallery: all approved photos
      rows = await queryMany(
        `SELECT cp.*, u.full_name, u.username, u.avatar_url,
                COALESCE(
                  (SELECT 1 FROM community_photo_likes l WHERE l.photo_id = cp.id AND l.user_id = $3),
                  0
                )::boolean AS liked_by_me
         FROM community_photos cp
         JOIN users u ON u.id = cp.user_id
         WHERE cp.status = 'approved'
         ORDER BY cp.created_at DESC
         LIMIT $1 OFFSET $2`,
        [limit, offset, auth.user?.id || '00000000-0000-0000-0000-000000000000']
      );
    }

    return apiResponse({ photos: rows, page, limit }, HttpStatus.OK);
  } catch (error) {
    return problemJson({
      status: 500,
      title: 'Fotoğraflar Alınamadı',
      detail: safeErrorDetail(error, 'Fotoğraflar yüklenemedi'),
      type: '/problems/community-photos-fetch-failed',
      instance: '/api/community/photos',
    });
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const auth = await requireAuth(request);
    if (!auth.user) {
      return problemJson({
        status: 401,
        title: 'Unauthorized',
        detail: 'Fotoğraf yüklemek için giriş yapmalısınız',
        type: '/problems/auth-required',
        instance: '/api/community/photos',
      });
    }

    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return problemJson({
        status: 400,
        title: 'Geçersiz İçerik Tipi',
        detail: 'multipart/form-data bekleniyor',
        type: '/problems/community-photo-content-type',
        instance: '/api/community/photos',
      });
    }

    // Check user photo count
    const countRow = await queryOne<{ count: number }>(
      'SELECT COUNT(*)::int AS count FROM community_photos WHERE user_id = $1',
      [auth.user.id]
    );
    if (Number(countRow?.count || 0) >= MAX_PHOTOS_PER_USER) {
      return apiError(ErrorCode.VALIDATION_ERROR, `En fazla ${MAX_PHOTOS_PER_USER} fotoğraf yükleyebilirsiniz`, 400);
    }

    const formData = await request.formData();
    const file = formData.get('photo') as File | null;
    const caption = typeof formData.get('caption') === 'string' ? String(formData.get('caption')).slice(0, 500) : '';
    const location = typeof formData.get('location') === 'string' ? String(formData.get('location')).slice(0, 100) : '';

    if (!file || !(file instanceof File)) {
      return apiError(ErrorCode.VALIDATION_ERROR, 'photo alanı zorunludur', 400);
    }
    if (file.size > MAX_PHOTO_SIZE) {
      return apiError(ErrorCode.VALIDATION_ERROR, 'Fotoğraf boyutu 10MB\'ı aşamaz', 400);
    }

    // HARD RULE #2: MIME → ext mapping (filename extension extraction yasak)
    const mimeType = file.type.toLowerCase();
    const ext = MIME_TO_EXT[mimeType];
    if (!ext) {
      return apiError(ErrorCode.VALIDATION_ERROR, 'Sadece JPEG, PNG, WebP ve GIF desteklenir', 400);
    }

    // Magic bytes validation
    const buffer = Buffer.from(await file.arrayBuffer());
    if (!validateImageSignature(buffer, mimeType)) {
      return apiError(ErrorCode.VALIDATION_ERROR, 'Geçersiz görsel dosyası', 400);
    }

    const saved = await saveFile(
      new File([buffer], `photo.${ext}`, { type: mimeType }),
      'community',
      undefined,
      buffer
    );

    const row = await queryOne(
      `INSERT INTO community_photos (user_id, file_path, caption, location, status)
       VALUES ($1, $2, $3, $4, 'pending')
       RETURNING *`,
      [auth.user.id, saved.filePath, caption, location || null]
    );

    logger.info('Community photo uploaded', { userId: auth.user.id, filePath: saved.filePath });

    return apiResponse({ photo: row, message: 'Fotoğrafınız admin onayına gönderildi' }, HttpStatus.CREATED);
  } catch (error) {
    return problemJson({
      status: 500,
      title: 'Yükleme Başarısız',
      detail: safeErrorDetail(error, 'Fotoğraf yüklenemedi'),
      type: '/problems/community-photo-upload-failed',
      instance: '/api/community/photos',
    });
  }
};
