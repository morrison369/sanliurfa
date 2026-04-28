// API: Ban/unban user (Admin only) (PostgreSQL)
import type { APIRoute } from 'astro';
import { query } from '../../../../lib/postgres';
import { logger } from '../../../../lib/logging';
import { problemJson } from '../../../../lib/api';

export const POST: APIRoute = async ({ params, request, locals }) => {
  try {
    const { id } = params;
    
    if (!locals.isAdmin) {
      return problemJson({
        status: 403,
        title: 'Unauthorized',
        detail: 'Admin yetkisi gerekli',
        type: '/problems/users-ban-unauthorized',
        instance: `/api/users/${id}/ban`,
      });
    }

    // Admin kendini banlayamasın
    if (id === locals.user?.id) {
      return problemJson({
        status: 400,
        title: 'Geçersiz İstek',
        detail: 'Kendi hesabınızı banlayamazsınız',
        type: '/problems/users-ban-self',
        instance: `/api/users/${id}/ban`,
      });
    }

    const formData = await request.formData();
    const isBanned = formData.get('is_banned') === 'true';
    const banReason = formData.get('ban_reason')?.toString();

    await query(
      `UPDATE users SET 
        is_banned = $1, 
        ban_reason = $2, 
        banned_at = $3, 
        banned_by = $4 
       WHERE id = $5`,
      [
        isBanned, 
        isBanned ? banReason : null, 
        isBanned ? new Date().toISOString() : null, 
        isBanned ? locals.user?.id : null, 
        id
      ]
    );

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    logger.error('Ban user error:', err);
    return problemJson({
      status: 500,
      title: 'Kullanıcı Ban Durumu Güncellenemedi',
      detail: 'Sunucu hatası',
      type: '/problems/users-ban-failed',
      instance: `/api/users/${params.id}/ban`,
    });
  }
};
