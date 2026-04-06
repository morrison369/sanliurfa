import type { APIRoute } from 'astro';
import { query } from '../../../../lib/postgres';

// Mark notification as read
export const POST: APIRoute = async ({ params, locals }) => {
  const user = locals.user;
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const { id } = params;

  try {
    await query(
      'UPDATE notifications SET is_read = true, read_at = $1 WHERE id = $2 AND user_id = $3',
      [new Date().toISOString(), id, user.id]
    );

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
};
