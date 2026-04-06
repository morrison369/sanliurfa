import type { APIRoute } from 'astro';
import { query } from '../../../lib/postgres';

// Get user notifications
export const GET: APIRoute = async ({ locals }) => {
  const user = locals.user;
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  try {
    const dataResult = await query(
      'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
      [user.id]
    );

    const countResult = await query(
      'SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = false',
      [user.id]
    );

    return new Response(JSON.stringify({ 
      data: dataResult.rows, 
      unreadCount: parseInt(countResult.rows[0]?.count || '0') 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
};

// Create notification (admin only)
export const POST: APIRoute = async ({ request, locals }) => {
  const user = locals.user;
  if (!user || !locals.isAdmin) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
  }

  try {
    const body = await request.json();
    const { user_id, type, title, message, data } = body;

    const result = await query(
      'INSERT INTO notifications (user_id, type, title, message, data, created_at) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [user_id, type, title, message, JSON.stringify(data), new Date().toISOString()]
    );

    return new Response(JSON.stringify({ success: true, notification: result.rows[0] }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
};
