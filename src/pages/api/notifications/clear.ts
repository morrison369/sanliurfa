import type { APIRoute } from 'astro';
import { query } from '../../../lib/postgres';
import { logger } from '../../../lib/logging';
import { apiResponse, problemJson, HttpStatus, safeErrorDetail } from '../../../lib/api';

// Tüm bildirimleri sil
export const DELETE: APIRoute = async ({ locals }) => {
  const user = locals.user;
  if (!user) {
    return problemJson({
      status: 401,
      title: 'Unauthorized',
      detail: 'Giriş yapmalısınız',
      type: '/problems/notifications-clear-unauthorized',
      instance: '/api/notifications/clear',
    });
  }

  try {
    await query(
      `DELETE FROM notifications WHERE user_id = $1`,
      [user.id]
    );

    return apiResponse({ success: true }, HttpStatus.OK);
  } catch (error) {
    logger.error('Clear notifications error:', error);
    return problemJson({
      status: 500,
      title: 'Bildirimler Temizlenemedi',
      detail: safeErrorDetail(error, 'server_error'),
      type: '/problems/notifications-clear-failed',
      instance: '/api/notifications/clear',
    });
  }
};
