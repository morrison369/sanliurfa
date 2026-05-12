import type { APIRoute } from 'astro';
import { query, queryOne, queryMany } from '../../../../lib/postgres';
import { deleteFile } from '../../../../lib/file/file-storage';
import { apiResponse, apiError, problemJson, HttpStatus, safeErrorDetail, safeIntParam, ErrorCode } from '../../../../lib/api';
import { logger } from '../../../../lib/logging';

export const GET: APIRoute = async ({ locals, url }) => {
  if (locals.user?.role !== 'admin' && locals.user?.role !== 'moderator') {
    return apiError(ErrorCode.FORBIDDEN, 'Yetki gerekli', 403);
  }

  const status = url.searchParams.get('status') || 'pending';
  const page = safeIntParam(url.searchParams.get('page'), 1, 1, 1000);
  const limit = safeIntParam(url.searchParams.get('limit'), 20, 1, 50);
  const offset = (page - 1) * limit;

  const VALID_STATUSES = new Set(['pending', 'approved', 'rejected', 'all']);
  const safeStatus = VALID_STATUSES.has(status) ? status : 'pending';

  try {
    const whereClause = safeStatus === 'all' ? '' : `WHERE cp.status = '${safeStatus}'`;

    const rows = await queryMany(
      `SELECT cp.*, u.full_name, u.username, u.email,
              ab.full_name AS approved_by_name
       FROM community_photos cp
       JOIN users u ON u.id = cp.user_id
       LEFT JOIN users ab ON ab.id = cp.approved_by
       ${whereClause}
       ORDER BY cp.created_at ${safeStatus === 'approved' ? 'DESC' : 'ASC'}
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const countRow = await queryOne<{ count: number }>(
      `SELECT COUNT(*)::int AS count FROM community_photos cp ${whereClause}`,
      []
    );

    return apiResponse({ photos: rows, total: countRow?.count || 0, page, limit }, HttpStatus.OK);
  } catch (error) {
    return problemJson({ status: 500, title: 'Liste Alınamadı', detail: safeErrorDetail(error, 'Admin fotoğraf listesi alınamadı'), type: '/problems/admin-community-photos-failed', instance: '/api/admin/community/photos' });
  }
};

export const PUT: APIRoute = async ({ request, locals, url }) => {
  if (locals.user?.role !== 'admin' && locals.user?.role !== 'moderator') {
    return apiError(ErrorCode.FORBIDDEN, 'Yetki gerekli', 403);
  }

  const photoId = url.searchParams.get('id');
  if (!photoId) return apiError(ErrorCode.VALIDATION_ERROR, 'id parametresi zorunludur', 400);

  try {
    const body = await request.json();
    const action = body?.action;

    if (!['approve', 'reject', 'delete'].includes(action)) {
      return apiError(ErrorCode.VALIDATION_ERROR, 'action: approve | reject | delete bekleniyor', 400);
    }

    if (action === 'approve') {
      await query(
        `UPDATE community_photos SET status = 'approved', approved_by = $2, approved_at = NOW(), updated_at = NOW()
         WHERE id = $1`,
        [photoId, locals.user!.id]
      );
      logger.info('Community photo approved', { photoId, adminId: locals.user!.id });
      return apiResponse({ message: 'Fotoğraf onaylandı' }, HttpStatus.OK);
    }

    if (action === 'reject') {
      const reason = typeof body?.reason === 'string' ? body.reason.slice(0, 500) : '';
      await query(
        `UPDATE community_photos SET status = 'rejected', rejection_reason = $2, updated_at = NOW()
         WHERE id = $1`,
        [photoId, reason || null]
      );
      logger.info('Community photo rejected', { photoId, adminId: locals.user!.id, reason });
      return apiResponse({ message: 'Fotoğraf reddedildi' }, HttpStatus.OK);
    }

    if (action === 'delete') {
      const photo = await queryOne<{ file_path: string }>(
        'SELECT file_path FROM community_photos WHERE id = $1',
        [photoId]
      );
      if (!photo) return apiError(ErrorCode.NOT_FOUND, 'Fotoğraf bulunamadı', 404);
      await query('DELETE FROM community_photos WHERE id = $1', [photoId]);
      await deleteFile((photo as any).file_path).catch(() => null);
      logger.info('Community photo deleted by admin', { photoId, adminId: locals.user!.id });
      return apiResponse({ message: 'Fotoğraf silindi' }, HttpStatus.OK);
    }

    return apiError(ErrorCode.VALIDATION_ERROR, 'Geçersiz aksiyon', 400);
  } catch (error) {
    return problemJson({ status: 500, title: 'İşlem Başarısız', detail: safeErrorDetail(error, 'Admin fotoğraf işlemi başarısız'), type: '/problems/admin-community-photo-action-failed', instance: '/api/admin/community/photos' });
  }
};
