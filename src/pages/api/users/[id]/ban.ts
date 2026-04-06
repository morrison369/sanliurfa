// API: Ban/unban user (Admin only) (PostgreSQL)
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

    // Admin kendini banlayamasın
    if (id === locals.user?.id) {
      return new Response(
        JSON.stringify({ error: 'Cannot ban yourself' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const formData = await request.formData();
    const isBanned = formData.get('is_banned') === 'true';
    const banReason = formData.get('ban_reason')?.toString();

    await query(
      `UPDATE users SET 
        is_banned = $1, 
        ban_reason = $2, 
        banned_at = $3, 
        banned_by = $4 
       WHERE id = $5`,
      [
        isBanned, 
        isBanned ? banReason : null, 
        isBanned ? new Date().toISOString() : null, 
        isBanned ? locals.user?.id : null, 
        id
      ]
    );

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Ban user error:', err);
    return new Response(
      JSON.stringify({ error: 'Server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
