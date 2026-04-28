// API: Delete user (Admin only) (PostgreSQL)
import type { APIRoute } from 'astro';
import { query } from '../../../../lib/postgres';
import { logger } from '../../../../lib/logging';
import { problemJson } from '../../../../lib/api';

export const POST: APIRoute = async ({ params, locals }) => {
  try {
    const { id } = params;
    
    if (!locals.isAdmin) {
      return problemJson({
        status: 403,
        title: 'Unauthorized',
        detail: 'Admin yetkisi gerekli',
        type: '/problems/users-delete-unauthorized',
        instance: `/api/users/${id}/delete`,
      });
    }

    // Admin kendini silemesin
    if (id === locals.user?.id) {
      return problemJson({
        status: 400,
        title: 'Geçersiz İstek',
        detail: 'Kendi hesabınızı silemezsiniz',
        type: '/problems/users-delete-self',
        instance: `/api/users/${id}/delete`,
      });
    }

    // Kullanıcıyı ve ilişkili verileri sil
    await query('DELETE FROM users WHERE id = $1', [id]);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    logger.error('Delete user error:', err);
    return problemJson({
      status: 500,
      title: 'Kullanıcı Silinemedi',
      detail: 'Sunucu hatası',
      type: '/problems/users-delete-failed',
      instance: `/api/users/${params.id}/delete`,
    });
  }
};
