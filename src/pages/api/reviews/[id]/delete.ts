// API: Review delete (Admin only) (PostgreSQL)
import type { APIRoute } from 'astro';
import { remove } from '../../../../lib/postgres';
import { problemJson, safeErrorDetail } from '../../../../lib/api';

export const POST: APIRoute = async ({ params, locals }) => {
  try {
    const { id } = params;
    
    if (!locals.isAdmin) {
      return problemJson({
        status: 403,
        title: 'Unauthorized',
        detail: 'Admin yetkisi gerekli',
        type: '/problems/review-delete-unauthorized',
        instance: '/api/reviews/{id}/delete',
      });
    }

    await remove('reviews', id);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return problemJson({
      status: 500,
      title: 'Yorum Silinemedi',
      detail: safeErrorDetail(err, 'server_error'),
      type: '/problems/review-delete-failed',
      instance: '/api/reviews/{id}/delete',
    });
  }
};
