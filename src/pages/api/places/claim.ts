import type { APIRoute } from 'astro';
import { queryOne } from '../../../lib/postgres';
import { apiResponse, apiError, safeErrorDetail } from '../../../lib/api';
import { logger } from '../../../lib/logging';

export const POST: APIRoute = async ({ request, locals }) => {
 if (!locals.user) return apiError('UNAUTHORIZED', 'Giriş yapmanız gerekiyor.', 401);

 let body: any;
 try { body = await request.json(); } catch { return apiError('VALIDATION_ERROR', 'Geçersiz istek gövdesi.', 400); }

 const { place_id, contact_name, contact_phone, contact_email, message } = body ?? {};

 if (!place_id || typeof place_id !== 'string') return apiError('VALIDATION_ERROR', 'Mekan ID gereklidir.', 400);
 if (!contact_name || String(contact_name).trim().length < 2) return apiError('VALIDATION_ERROR', 'Ad Soyad gereklidir.', 400);

 const cleanName = String(contact_name).trim().slice(0, 200);
 const cleanPhone = contact_phone ? String(contact_phone).trim().slice(0, 50) : null;
 const cleanEmail = contact_email ? String(contact_email).trim().toLowerCase().slice(0, 200) : null;
 const cleanMessage = message ? String(message).trim().slice(0, 1000) : null;

 try {
  // Verify the place exists and is active
  const place = await queryOne('SELECT id, name FROM places WHERE id = $1 AND status = $2', [place_id, 'active']);
  if (!place) return apiError('NOT_FOUND', 'Mekan bulunamadı.', 404);

  // Check for existing pending/approved claim by this user
  const existing = await queryOne(
   'SELECT id, status FROM place_claims WHERE place_id = $1 AND user_id = $2',
   [place_id, locals.user.id],
  );
  if (existing) {
   if (existing.status === 'approved') return apiError('CONFLICT', 'Bu mekan için sahiplik talebiniz zaten onaylandı.', 409);
   if (existing.status === 'pending') return apiError('CONFLICT', 'Bu mekan için bekleyen bir talebiniz var.', 409);
  }

  const claim = await queryOne(
   `INSERT INTO place_claims (place_id, user_id, contact_name, contact_phone, contact_email, message)
    VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (place_id, user_id) DO UPDATE
     SET status = 'pending', contact_name = $3, contact_phone = $4, contact_email = $5, message = $6, updated_at = NOW()
    RETURNING id, status`,
   [place_id, locals.user.id, cleanName, cleanPhone, cleanEmail, cleanMessage],
  );

  logger.info('Place claim submitted', { claimId: claim?.id, placeId: place_id, userId: locals.user.id });
  return apiResponse({ success: true, claimId: claim?.id }, 201);
 } catch (err) {
  logger.error('Place claim error', err instanceof Error ? err : new Error(String(err)));
  return apiError('SERVER_ERROR', safeErrorDetail(err, 'Talep gönderilirken hata oluştu.'), 500);
 }
};
