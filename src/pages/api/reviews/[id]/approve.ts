// API: Review approve (Admin only) (PostgreSQL)
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

    await query(
      `UPDATE reviews SET 
        is_approved = true, 
        is_moderated = true, 
        moderated_at = $1, 
        moderated_by = $2 
       WHERE id = $3`,
      [new Date().toISOString(), locals.user?.id, id]
    );

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Review approve error:', err);
    return new Response(
      JSON.stringify({ error: 'Server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
