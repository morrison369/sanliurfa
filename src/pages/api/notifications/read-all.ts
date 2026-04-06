import type { APIRoute } from 'astro';
import { query } from '../../../lib/postgres';

// Mark all notifications as read
export const POST: APIRoute = async ({ locals }) => {
  const user = locals.user;
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  try {
    await query(
      'UPDATE notifications SET is_read = true, read_at = $1 WHERE user_id = $2 AND is_read = false',
      [new Date().toISOString(), user.id]
    );

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
};
