// API: Historical site delete (Admin only) (PostgreSQL)
import type { APIRoute } from 'astro';
import { remove } from '../../../../lib/postgres';

export const POST: APIRoute = async ({ params, locals }) => {
  try {
    const { id } = params;
    
    if (!locals.isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    await remove('historical_sites', id);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
