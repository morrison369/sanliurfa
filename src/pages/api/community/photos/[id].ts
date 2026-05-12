import type { APIRoute } from 'astro';
import { requireAuth } from '../../../../lib/auth';
import { query, queryOne } from '../../../../lib/postgres';
import { deleteFile } from '../../../../lib/file/file-storage';
import { apiResponse, apiError, problemJson, HttpStatus, safeErrorDetail, ErrorCode } from '../../../../lib/api';
import { logger } from '../../../../lib/logging';

export const POST: APIRoute = async ({ request, params }) => {
  const photoId = params.id;
  const url = new URL(request.url);
  const action = url.searchParams.get('action');

  if (action === 'like') {
    return handleLike(request, photoId!);
  }
  if (action === 'view') {
    return handleView(photoId!);
  }

  return problemJson({
    status: 400,
    title: 'Geçersiz Aksiyon',
    detail: 'action=like veya action=view bekleniyor',
    type: '/problems/community-photo-invalid-action',
    instance: `/api/community/photos/${photoId}`,
  });
};

async function handleLike(request: Request, photoId: string): Promise<Response> {
  try {
    const auth = await requireAuth(request);
    if (!auth.user) {
      return problemJson({ status: 401, title: 'Unauthorized', detail: 'Giriş gerekli', type: '/problems/auth-required', instance: `/api/community/photos/${photoId}` });
    }

    const photo = await queryOne('SELECT id, status FROM community_photos WHERE id = $1', [photoId]);
    if (!photo || (photo as any).status !== 'approved') {
      return apiError(ErrorCode.NOT_FOUND, 'Fotoğraf bulunamadı', 404);
    }

    // Toggle like atomically
    const existing = await queryOne(
      'SELECT id FROM community_photo_likes WHERE photo_id = $1 AND user_id = $2',
      [photoId, auth.user.id]
    );

    let liked: boolean;
    if (existing) {
      await query('DELETE FROM community_photo_likes WHERE photo_id = $1 AND user_id = $2', [photoId, auth.user.id]);
      await query('UPDATE community_photos SET like_count = GREATEST(0, like_count - 1) WHERE id = $1', [photoId]);
      liked = false;
    } else {
      await query(
        'INSERT INTO community_photo_likes (photo_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [photoId, auth.user.id]
      );
      await query('UPDATE community_photos SET like_count = like_count + 1 WHERE id = $1', [photoId]);
      liked = true;
    }

    const row = await queryOne<{ like_count: number }>('SELECT like_count FROM community_photos WHERE id = $1', [photoId]);
    return apiResponse({ liked, likeCount: row?.like_count ?? 0 }, HttpStatus.OK);
  } catch (error) {
    return problemJson({ status: 500, title: 'Beğeni Kaydedilemedi', detail: safeErrorDetail(error, 'Beğeni işlemi başarısız'), type: '/problems/community-photo-like-failed', instance: `/api/community/photos/${photoId}` });
  }
}

async function handleView(photoId: string): Promise<Response> {
  try {
    await query(
      'UPDATE community_photos SET view_count = view_count + 1 WHERE id = $1 AND status = $2',
      [photoId, 'approved']
    );
    return apiResponse({ ok: true }, HttpStatus.OK);
  } catch {
    return apiResponse({ ok: false }, HttpStatus.OK);
  }
}

export const DELETE: APIRoute = async ({ request, params }) => {
  try {
    const photoId = params.id;
    const auth = await requireAuth(request);
    if (!auth.user) {
      return problemJson({ status: 401, title: 'Unauthorized', detail: 'Giriş gerekli', type: '/problems/auth-required', instance: `/api/community/photos/${photoId}` });
    }

    const photo = await queryOne<{ file_path: string; user_id: string }>(
      'SELECT file_path, user_id FROM community_photos WHERE id = $1',
      [photoId]
    );

    if (!photo) return apiError(ErrorCode.NOT_FOUND, 'Fotoğraf bulunamadı', 404);

    const isOwner = (photo as any).user_id === auth.user.id;
    const isAdmin = auth.user.role === 'admin' || auth.user.role === 'moderator';
    if (!isOwner && !isAdmin) return apiError(ErrorCode.FORBIDDEN, 'Bu işlem için yetkiniz yok', 403);

    await query('DELETE FROM community_photos WHERE id = $1', [photoId]);
    await deleteFile((photo as any).file_path).catch(() => null);
    logger.info('Community photo deleted', { photoId, deletedBy: auth.user.id });

    return apiResponse({ message: 'Fotoğraf silindi' }, HttpStatus.OK);
  } catch (error) {
    return problemJson({ status: 500, title: 'Silinemedi', detail: safeErrorDetail(error, 'Fotoğraf silinemedi'), type: '/problems/community-photo-delete-failed', instance: `/api/community/photos/${params.id}` });
  }
};
