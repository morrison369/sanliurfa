// API: Update contact message status (Admin only) (PostgreSQL)
import type { APIRoute } from 'astro';
import { query } from '../../../../../lib/postgres';

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
    const status = formData.get('status')?.toString();

    if (!status || !['new', 'read', 'replied', 'archived'].includes(status)) {
      return new Response(
        JSON.stringify({ error: 'Invalid status' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    await query(
      'UPDATE contact_messages SET status = $1, updated_at = $2 WHERE id = $3',
      [status, new Date().toISOString(), id]
    );

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Message status update error:', err);
    return new Response(
      JSON.stringify({ error: 'Server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
