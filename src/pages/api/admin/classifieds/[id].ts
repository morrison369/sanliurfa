import type { APIRoute } from 'astro';
import { apiResponse, apiError, safeErrorDetail } from '../../../../lib/api';
import { query } from '../../../../lib/postgres';

const ALLOWED_STATUSES = ['active', 'rejected', 'archived', 'pending', 'expired'] as const;

export const PATCH: APIRoute = async ({ params, request, locals }) => {
  const requestId = request.headers.get('X-Request-ID') || crypto.randomUUID();

  if (!locals.user || locals.user.role !== 'admin') {
    return apiError('FORBIDDEN', 'Admin yetkisi gerekli', 403, undefined, requestId);
  }

  const id = params.id;
  if (!id) {
    return apiError('BAD_REQUEST', 'İlan ID eksik', 400, undefined, requestId);
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return apiError('BAD_REQUEST', 'Geçersiz JSON', 400, undefined, requestId);
  }

  const { status, moderation_note } = body as { status?: string; moderation_note?: string };

  if (!status || !ALLOWED_STATUSES.includes(status as typeof ALLOWED_STATUSES[number])) {
    return apiError('BAD_REQUEST', `Geçersiz durum. İzin verilenler: ${ALLOWED_STATUSES.join(', ')}`, 400, undefined, requestId);
  }

  try {
    const result = await query(
      `UPDATE classified_listings
       SET status = $1,
           moderation_note = COALESCE($2, moderation_note),
           moderated_by = $3,
           moderated_at = NOW(),
           published_at = CASE WHEN $1 = 'active' AND published_at IS NULL THEN NOW() ELSE published_at END
       WHERE id = $4
       RETURNING id, title, status`,
      [status, moderation_note || null, locals.user.id, id]
    );

    if (result.rows.length === 0) {
      return apiError('NOT_FOUND', 'İlan bulunamadı', 404, undefined, requestId);
    }

    return apiResponse({ listing: result.rows[0] }, 200, requestId);
  } catch (err) {
    return apiError('SERVER_ERROR', safeErrorDetail(err, 'İlan güncellenirken hata oluştu'), 500, undefined, requestId);
  }
};
