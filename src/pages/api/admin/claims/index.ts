import type { APIRoute } from 'astro';
import { query } from '../../../../lib/postgres';
import { apiResponse, apiError, safeIntParam, safeErrorDetail } from '../../../../lib/api';
import { logger } from '../../../../lib/logging';

export const GET: APIRoute = async ({ locals, url }) => {
 if (locals.user?.role !== 'admin') return apiError('FORBIDDEN', 'Yetkisiz erişim.', 403);

 const status = url.searchParams.get('status') || 'pending';
 const page = safeIntParam(url.searchParams.get('page'), 1, 1, 1000);
 const limit = safeIntParam(url.searchParams.get('limit'), 20, 1, 100);
 const offset = (page - 1) * limit;

 const VALID_STATUS = new Set(['pending', 'approved', 'rejected', 'all']);
 if (!VALID_STATUS.has(status)) return apiError('VALIDATION_ERROR', 'Geçersiz durum filtresi.', 400);

 try {
  const statusFilter = status === 'all' ? '' : 'AND pc.status = $3';
  const params = status === 'all' ? [limit, offset] : [limit, offset, status];

  const result = await query(
   `SELECT pc.id, pc.status, pc.contact_name, pc.contact_phone, pc.contact_email,
           pc.message, pc.admin_note, pc.created_at, pc.reviewed_at,
           p.id as place_id, p.name as place_name, p.slug as place_slug,
           u.full_name as user_name, u.email as user_email
    FROM place_claims pc
    JOIN places p ON p.id = pc.place_id
    JOIN users u ON u.id = pc.user_id
    WHERE 1=1 ${statusFilter}
    ORDER BY pc.created_at DESC
    LIMIT $1 OFFSET $2`,
   params,
  );

  return apiResponse({ claims: result.rows, page, limit });
 } catch (err) {
  logger.error('Admin claims list error', err instanceof Error ? err : new Error(String(err)));
  return apiError('SERVER_ERROR', safeErrorDetail(err, 'Talepler yüklenemedi.'), 500);
 }
};
