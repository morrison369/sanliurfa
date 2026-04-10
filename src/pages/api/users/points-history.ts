import type { APIRoute } from 'astro';
import { queryRows } from '../../../lib/postgres';

export const GET: APIRoute = async ({ locals, url }) => {
  try {
    if (!locals.user?.id) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);

    const history = await queryRows(
      `SELECT id, action_type, metadata, points_earned, created_at 
       FROM user_activity 
       WHERE user_id = $1 AND action_type IN ('review_created', 'comment_posted', 'favorite_added')
       ORDER BY created_at DESC
       LIMIT $2`,
      [locals.user.id, limit]
    );

    const summary = await queryRows(
      `SELECT action_type, COUNT(*) as count, COALESCE(SUM((metadata->>'points')::int), 0) as total_points
       FROM user_activity 
       WHERE user_id = $1 AND action_type IN ('review_created', 'comment_posted', 'favorite_added')
       GROUP BY action_type`,
      [locals.user.id]
    );

    return new Response(JSON.stringify({
      success: true,
      data: {
        history,
        summary
      }
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('Points history error', error);
    return new Response(JSON.stringify({ error: 'Failed' }), { status: 500 });
  }
};
