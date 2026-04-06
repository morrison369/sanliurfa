// API: Delete user (Admin only) (PostgreSQL)
import type { APIRoute } from 'astro';
import { query } from '../../../../lib/postgres';

export const POST: APIRoute = async ({ params, locals }) => {
  try {
    const { id } = params;
    
    if (!locals.isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Admin kendini silemesin
    if (id === locals.user?.id) {
      return new Response(
        JSON.stringify({ error: 'Cannot delete yourself' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Kullanıcıyı ve ilişkili verileri sil
    await query('DELETE FROM users WHERE id = $1', [id]);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Delete user error:', err);
    return new Response(
      JSON.stringify({ error: 'Server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
