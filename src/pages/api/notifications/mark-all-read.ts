import type { APIRoute } from 'astro';
import { query } from '../../../lib/postgres';
import { logger } from '../../../lib/logging';
import { apiResponse, problemJson, HttpStatus } from '../../../lib/api';

// Tüm bildirimleri okundu işaretle
export const POST: APIRoute = async ({ locals }) => {
  const user = locals.user;
  if (!user) {
    return problemJson({
      status: 401,
      title: 'Unauthorized',
      detail: 'Giriş gerekli',
      type: '/problems/auth-required',
      instance: '/api/notifications/mark-all-read',
    });
  }

  try {
    await query(
      `UPDATE notifications SET read = true, read_at = $1 WHERE user_id = $2 AND read = false`,
      [new Date().toISOString(), user.id]
    );

    return apiResponse({ success: true }, HttpStatus.OK);
  } catch (error) {
    logger.error('Mark all read error:', error);
    return problemJson({
      status: 500,
      title: 'Server Error',
      detail: 'Bildirimler güncellenirken hata oluştu',
      type: '/problems/notifications-mark-all-read-failed',
      instance: '/api/notifications/mark-all-read',
    });
  }
};
