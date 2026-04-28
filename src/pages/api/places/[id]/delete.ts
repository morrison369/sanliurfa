// API: Place delete (PostgreSQL)
import type { APIRoute } from 'astro';
import { remove } from '../../../../lib/postgres';
import { problemJson } from '../../../../lib/api';

export const POST: APIRoute = async ({ params, locals }) => {
  try {
    const { id } = params;
    
    if (locals.user?.role !== 'admin') {
      return problemJson({
        status: 403,
        title: 'Unauthorized',
        detail: 'Admin yetkisi gerekli',
        type: '/problems/places-delete-unauthorized',
        instance: `/api/places/${id}/delete`,
      });
    }

    await remove('places', id);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return problemJson({
      status: 500,
      title: 'Mekan Silinemedi',
      detail: 'Sunucu hatası',
      type: '/problems/places-delete-failed',
      instance: `/api/places/${params.id}/delete`,
    });
  }
};
