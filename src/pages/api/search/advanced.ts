import type { APIRoute } from 'astro';
import { query } from '../../../lib/postgres';

export const GET: APIRoute = async ({ url }) => {
  const searchQuery = url.searchParams.get('q') || '';
  
  const result = await query(
    'SELECT * FROM places WHERE status = $1 AND (name ILIKE $2 OR description ILIKE $2) LIMIT 20',
    ['active', `%${searchQuery}%`]
  );

  return new Response(JSON.stringify({ results: result.rows }), { status: 200 });
};
