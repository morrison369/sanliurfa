import type { APIRoute } from 'astro';
import { query } from '../../../../lib/postgres';
import { problemJson } from '../../../../lib/api';

// Mark notification as read
export const POST: APIRoute = async ({ params, locals }) => {
  const user = locals.user;
  if (!user) {
    return problemJson({
      status: 401,
      title: 'Unauthorized',
      detail: 'Giriş yapmalısınız',
      type: '/problems/notifications-read-unauthorized',
      instance: '/api/notifications/{id}/read',
    });
  }

  const { id } = params;

  try {
    await query(
      'UPDATE notifications SET read = true, read_at = $1 WHERE id = $2 AND user_id = $3',
      [new Date().toISOString(), id, user.id]
    );

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    return problemJson({
      status: 500,
      title: 'Bildirim Güncellenemedi',
      detail: error instanceof Error ? error.message : 'notification_read_failed',
      type: '/problems/notifications-read-failed',
      instance: '/api/notifications/{id}/read',
    });
  }
};
