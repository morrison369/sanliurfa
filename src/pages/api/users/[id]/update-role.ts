// API: Update user role (Admin only) (PostgreSQL)
import type { APIRoute } from 'astro';
import { query } from '../../../../lib/postgres';

export const POST: APIRoute = async ({ params, request, locals }) => {
  try {
    const { id } = params;
    
    if (!locals.isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const formData = await request.formData();
    const role = formData.get('role')?.toString();

    if (!role || !['user', 'admin', 'moderator'].includes(role)) {
      return new Response(
        JSON.stringify({ error: 'Invalid role' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Admin kendi rolünü değiştiremesin
    if (id === locals.user?.id && role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Cannot change own role' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    await query('UPDATE users SET role = $1 WHERE id = $2', [role, id]);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Update role error:', err);
    return new Response(
      JSON.stringify({ error: 'Server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
