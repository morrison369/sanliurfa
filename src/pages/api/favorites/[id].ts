import type { APIRoute } from 'astro';
import { query } from '../../../lib/postgres';
import { logger } from '../../../lib/logging';
import { problemJson } from '../../../lib/api';

// Favori ID ile silme
export const DELETE: APIRoute = async ({ params, locals }) => {
  const user = locals.user;
  if (!user) {
    return problemJson({
      status: 401,
      title: 'Unauthorized',
      detail: 'Oturum açmanız gerekiyor',
      type: '/problems/favorite-delete-unauthorized',
      instance: '/api/favorites/[id]',
    });
  }

  const { id } = params;
  if (!id) {
    return problemJson({
      status: 400,
      title: 'Geçersiz İstek',
      detail: 'Favori kimliği gerekli',
      type: '/problems/favorite-delete-id-required',
      instance: '/api/favorites/[id]',
    });
  }

  try {
    const result = await query(
      'DELETE FROM user_favorites WHERE id = $1 AND user_id = $2',
      [id, user.id]
    );

    if (result.rowCount === 0) {
      return problemJson({
        status: 404,
        title: 'Bulunamadı',
        detail: 'Favori bulunamadı',
        type: '/problems/favorite-delete-not-found',
        instance: `/api/favorites/${id}`,
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    logger.error('Delete favorite error:', error);
    return problemJson({
      status: 500,
      title: 'Favori Silinemedi',
      detail: 'Sunucu hatası',
      type: '/problems/favorite-delete-failed',
      instance: `/api/favorites/${id}`,
    });
  }
};
