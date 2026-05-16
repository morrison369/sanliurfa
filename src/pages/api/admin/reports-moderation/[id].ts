import type { APIRoute } from 'astro';
import { apiResponse, apiError, safeErrorDetail } from '../../../../lib/api';
import { query } from '../../../../lib/postgres';

const ALLOWED_STATUSES = ['pending', 'resolved', 'dismissed'] as const;

export const PATCH: APIRoute = async ({ params, request, locals }) => {
  const requestId = request.headers.get('X-Request-ID') || crypto.randomUUID();

  if (!locals.user || locals.user.role !== 'admin') {
    return apiError('FORBIDDEN', 'Admin yetkisi gerekli', 403, undefined, requestId);
  }

  const id = params.id;
  if (!id) {
    return apiError('BAD_REQUEST', 'Rapor ID eksik', 400, undefined, requestId);
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return apiError('BAD_REQUEST', 'Geçersiz JSON', 400, undefined, requestId);
  }

  const { status, moderator_notes } = body as { status?: string; moderator_notes?: string };

  if (!status || !ALLOWED_STATUSES.includes(status as typeof ALLOWED_STATUSES[number])) {
    return apiError('BAD_REQUEST', `Geçersiz durum. İzin verilenler: ${ALLOWED_STATUSES.join(', ')}`, 400, undefined, requestId);
  }

  try {
    const result = await query(
      `UPDATE content_reports
       SET status = $1,
           moderator_notes = COALESCE($2, moderator_notes),
           resolved_at = CASE WHEN $1 != 'pending' THEN NOW() ELSE NULL END
       WHERE id = $3
       RETURNING id, status`,
      [status, moderator_notes || null, id]
    );

    if (result.rows.length === 0) {
      return apiError('NOT_FOUND', 'Rapor bulunamadı', 404, undefined, requestId);
    }

    return apiResponse({ report: result.rows[0] }, 200, requestId);
  } catch (err) {
    return apiError('SERVER_ERROR', safeErrorDetail(err, 'Rapor güncellenirken hata oluştu'), 500, undefined, requestId);
  }
};
