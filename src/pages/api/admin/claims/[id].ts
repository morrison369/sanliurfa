import type { APIRoute } from 'astro';
import { query, queryOne } from '../../../../lib/postgres';
import { apiResponse, apiError, safeErrorDetail } from '../../../../lib/api';
import { logger } from '../../../../lib/logging';

export const PUT: APIRoute = async ({ request, locals, params }) => {
 if (locals.user?.role !== 'admin') return apiError('FORBIDDEN', 'Yetkisiz erişim.', 403);

 const { id } = params;
 if (!id) return apiError('VALIDATION_ERROR', 'ID gerekli.', 400);

 let body: any;
 try { body = await request.json(); } catch { return apiError('VALIDATION_ERROR', 'Geçersiz istek.', 400); }

 const { action, admin_note } = body ?? {};
 const VALID_ACTIONS = new Set(['approve', 'reject']);
 if (!VALID_ACTIONS.has(action)) return apiError('VALIDATION_ERROR', 'Geçersiz işlem. approve veya reject olmalı.', 400);

 const newStatus = action === 'approve' ? 'approved' : 'rejected';
 const cleanNote = admin_note ? String(admin_note).trim().slice(0, 500) : null;

 try {
  const claim = await queryOne(
   `UPDATE place_claims
    SET status = $1, admin_note = $2, reviewed_by = $3, reviewed_at = NOW(), updated_at = NOW()
    WHERE id = $4
    RETURNING id, place_id, user_id, status`,
   [newStatus, cleanNote, locals.user.id, id],
  );
  if (!claim) return apiError('NOT_FOUND', 'Talep bulunamadı.', 404);

  // If approved, set place owner_id and is_verified
  if (action === 'approve') {
   await query(
    'UPDATE places SET owner_id = $1, is_verified = true WHERE id = $2',
    [claim.user_id, claim.place_id],
   );
  }

  logger.info('Place claim reviewed', { claimId: id, action, reviewerId: locals.user.id });
  return apiResponse({ success: true, status: newStatus });
 } catch (err) {
  logger.error('Admin claim review error', err instanceof Error ? err : new Error(String(err)));
  return apiError('SERVER_ERROR', safeErrorDetail(err, 'İşlem sırasında hata oluştu.'), 500);
 }
};
