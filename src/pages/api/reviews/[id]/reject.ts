// API: Review reject (Admin only) (PostgreSQL)
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
    const rejectionReason = formData.get('rejection_reason')?.toString() || 'Uygun görülmedi';

    await query(
      `UPDATE reviews SET 
        is_approved = false, 
        is_moderated = true, 
        moderated_at = $1, 
        moderated_by = $2, 
        rejection_reason = $3 
       WHERE id = $4`,
      [new Date().toISOString(), locals.user?.id, rejectionReason, id]
    );

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Review reject error:', err);
    return new Response(
      JSON.stringify({ error: 'Server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
