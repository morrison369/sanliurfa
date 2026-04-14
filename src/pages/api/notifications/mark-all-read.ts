import type { APIRoute } from 'astro';
import { query } from '../../../lib/postgres';

// Tüm bildirimleri okundu işaretle
export const POST: APIRoute = async ({ locals }) => {
  const user = locals.user;
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    await query(
      `UPDATE notifications SET read = true, read_at = $1 WHERE user_id = $2 AND read = false`,
      [new Date().toISOString(), user.id]
    );

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error('Mark all read error:', error);
    return new Response(JSON.stringify({ error: 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
