// API: Update user role (Admin only) (PostgreSQL)
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
        type: '/problems/users-update-role-unauthorized',
        instance: `/api/users/${id}/update-role`,
      });
    }

    const formData = await request.formData();
    const role = formData.get('role')?.toString();

    if (!role || !['user', 'admin', 'moderator'].includes(role)) {
      return problemJson({
        status: 400,
        title: 'Geçersiz İstek',
        detail: 'Geçersiz rol',
        type: '/problems/users-update-role-invalid',
        instance: `/api/users/${id}/update-role`,
      });
    }

    // Admin kendi rolünü değiştiremesin
    if (id === locals.user?.id && role !== 'admin') {
      return problemJson({
        status: 400,
        title: 'Geçersiz İstek',
        detail: 'Kendi rolünüzü değiştiremezsiniz',
        type: '/problems/users-update-role-self',
        instance: `/api/users/${id}/update-role`,
      });
    }

    await query('UPDATE users SET role = $1 WHERE id = $2', [role, id]);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    logger.error('Update role error:', err);
    return problemJson({
      status: 500,
      title: 'Rol Güncellenemedi',
      detail: 'Sunucu hatası',
      type: '/problems/users-update-role-failed',
      instance: `/api/users/${params.id}/update-role`,
    });
  }
};
