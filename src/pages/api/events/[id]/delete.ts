// API: Event delete (Admin only) (PostgreSQL)
import type { APIRoute } from 'astro';
import { problemJson } from '../../../../lib/api';
import { deleteAdminEvent } from '../../../../lib/admin/events-admin';

export const POST: APIRoute = async ({ params, locals }) => {
  try {
    const { id } = params;
    
    if (!locals.isAdmin) {
      return problemJson({
        status: 403,
        title: 'Unauthorized',
        detail: 'Admin yetkisi gerekli',
        type: '/problems/events-delete-unauthorized',
        instance: `/api/events/${id}/delete`,
      });
    }

    await deleteAdminEvent(id || '');

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return problemJson({
      status: 500,
      title: 'Etkinlik Silinemedi',
      detail: 'Sunucu hatası',
      type: '/problems/events-delete-failed',
      instance: `/api/events/${params.id}/delete`,
    });
  }
};
