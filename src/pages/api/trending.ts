import type { APIRoute } from 'astro';
import { queryMany } from '../../lib/postgres';

export const GET: APIRoute = async ({ url }) => {
  try {
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);
    const type = url.searchParams.get('type') || 'all';

    let query = '';

    if (type === 'places' || type === 'all') {
      query = `SELECT p.id, p.name, p.category, p.image_url, 
                      AVG(r.rating) as avg_rating, 
                      COUNT(r.id) as review_count,
                      COUNT(f.id) as favorite_count
               FROM places p
               LEFT JOIN reviews r ON p.id = r.place_id AND r.created_at > NOW() - INTERVAL '30 days'
               LEFT JOIN favorites f ON p.id = f.place_id AND f.created_at > NOW() - INTERVAL '30 days'
               WHERE p.is_active = true
               GROUP BY p.id
               ORDER BY favorite_count DESC, review_count DESC
               LIMIT $1`;
    }

    const result = await queryMany(query, [limit]);

    return new Response(JSON.stringify({
      success: true,
      data: result.rows || [],
      type
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('Trending error', error);
    return new Response(JSON.stringify({ error: 'Failed' }), { status: 500 });
  }
};
